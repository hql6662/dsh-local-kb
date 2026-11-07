// dsh-local-kb — Host side: read-only FTS5 query layer, local HTTP API,
// and a token-efficient `kb` tool for the agent path.
// No document body is ever loaded into the model context by this module:
// queries return short snippets, and `get` is explicitly capped.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

export const name = 'dsh-local-kb';
export const inject = ['tools', 'webServer'];

const NS = name;
const API_PREFIX = '/local-kb/api';
const VERSION = '0.1.0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(PKG_DIR, 'tools');
const BUILDER = path.join(TOOLS_DIR, 'build_kb.py');
const DATA_DIR = path.join(os.homedir(), '.dsh', 'local-kb');
const DB_PATH = path.join(DATA_DIR, 'kb.sqlite');
const STAGING_DB = path.join(DATA_DIR, 'kb.sqlite.building');
const REPORT_PATH = path.join(DATA_DIR, 'build_report.json');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  roots: 'C:/,E:/',
  maxChars: 30000,
  maxBytes: 40 * 1024 * 1024,
  python: '',
};
const PYTHON_CANDIDATES = [
  'C:/Python314/python.exe',
  'C:/Python313/python.exe',
  'C:/Python312/python.exe',
  'C:/Python311/python.exe',
  path.join(os.homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'),
  'python',
];

// ---------------------------------------------------------------- helpers
function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const next = { ...DEFAULT_CONFIG, ...cfg };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function resolvePython(cfg) {
  if (cfg.python && fs.existsSync(cfg.python)) return cfg.python;
  for (const candidate of PYTHON_CANDIDATES) {
    if (candidate === 'python' || fs.existsSync(candidate)) return candidate;
  }
  return 'python';
}

function openDb(file = DB_PATH) {
  if (!fs.existsSync(file)) return null;
  return new DatabaseSync(file, { readOnly: true });
}

function phrase(q) {
  return '"' + String(q || '').trim().replace(/"/g, '""') + '"';
}

function dbError(message) {
  return { ok: false, error: message, hint: '在插件面板点击「重建索引」，或运行 tools/build_kb.py' };
}

function snippetText(snip) {
  return String(snip || '').replace(/\u0001/g, '').replace(/\u0002/g, '');
}

// ---------------------------------------------------------------- backend
export function createBackend() {
  const state = { running: false, startedAt: 0, finishedAt: 0, ok: null, error: '', logTail: '', report: null };

  function withDb(fn, fallback) {
    let db;
    try {
      db = openDb();
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
    if (!db) return fallback || dbError('索引尚未建立：' + DB_PATH);
    try {
      return fn(db);
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  }

  function stats() {
    return withDb((db) => {
      const meta = {};
      for (const row of db.prepare('SELECT key, value FROM meta').all()) {
        try { meta[row.key] = JSON.parse(row.value); } catch { meta[row.key] = row.value; }
      }
      const group = (col) => Object.fromEntries(
        db.prepare(`SELECT ${col} AS k, count(*) AS n FROM docs GROUP BY ${col} ORDER BY n DESC`).all()
          .map((r) => [String(r.k), r.n]),
      );
      return {
        ok: true,
        db: DB_PATH,
        dbExists: true,
        dbSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0,
        total: db.prepare('SELECT count(*) AS n FROM docs').get().n,
        byExt: group('ext'),
        byCategory: group('category'),
        byRoot: group('root'),
        byStatus: group('status'),
        indexedChars: db.prepare('SELECT coalesce(sum(chars), 0) AS n FROM docs').get().n,
        meta,
      };
    }, dbError('索引尚未建立：' + DB_PATH));
  }

  function filters(opts, params) {
    let sql = '';
    if (opts.ext) {
      const exts = String(opts.ext).split(',').map((e) => e.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
      if (exts.length) {
        sql += ` AND d.ext IN (${exts.map(() => '?').join(',')})`;
        params.push(...exts);
      }
    }
    if (opts.category) { sql += ' AND d.category = ?'; params.push(String(opts.category)); }
    if (opts.root) {
      const key = String(opts.root).replace(/[^A-Za-z0-9]/g, '');
      if (key) { sql += ' AND d.root LIKE ?'; params.push(key + '%'); }
    }
    return sql;
  }

  function search(opts = {}) {
    const q = String(opts.q || '').trim();
    if (!q) return { ok: false, error: '空查询', results: [] };
    const limit = Math.max(1, Math.min(Number(opts.limit) || 20, 100));
    const offset = Math.max(0, Number(opts.offset) || 0);
    const t0 = Date.now();
    return withDb((db) => {
      const params = [phrase(q)];
      const extra = filters(opts, params);
      let rows = [];
      let mode = 'fts';
      if (q.length >= 3) {
        const sql =
          'SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,d.chars,d.status,d.head,' +
          "snippet(fts,1,char(1),char(2),'…',36) AS snip,bm25(fts,1.0,1.0) AS score " +
          'FROM fts JOIN docs d ON d.id = fts.rowid WHERE fts MATCH ?' + extra +
          ' ORDER BY rank LIMIT ? OFFSET ?';
        try {
          rows = db.prepare(sql).all(...params, limit, offset);
        } catch { rows = []; }
        if (!rows.length) mode = 'like';
      } else {
        mode = 'like';
      }
      if (mode === 'like') {
        const like = '%' + q.replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';
        const lparams = [like, like];
        const lextra = filters(opts, lparams);
        const sql =
          'SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,d.chars,d.status,d.head,' +
          'NULL AS snip, 0 AS score FROM docs d ' +
          "WHERE (d.name LIKE ? ESCAPE '\\' OR d.head LIKE ? ESCAPE '\\')" + lextra +
          ' ORDER BY d.mtime DESC LIMIT ? OFFSET ?';
        rows = db.prepare(sql).all(...lparams, limit, offset);
        rows = rows.map((r) => ({ ...r, snip: String(r.head || r.name || '').slice(0, 160) }));
      }
      let total = rows.length + offset;
      try {
        const tparams = [phrase(q)];
        const textra = filters(opts, tparams);
        if (mode === 'fts') {
          total = db.prepare('SELECT count(*) AS n FROM fts JOIN docs d ON d.id = fts.rowid WHERE fts MATCH ?' + textra)
            .get(...tparams).n;
        } else {
          const like = '%' + q.replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';
          const lp = [like, like];
          const le = filters(opts, lp);
          total = db.prepare("SELECT count(*) AS n FROM docs d WHERE (d.name LIKE ? ESCAPE '\\' OR d.head LIKE ? ESCAPE '\\')" + le)
            .get(...lp).n;
        }
      } catch { /* keep lower bound */ }
      return {
        ok: true, query: q, mode, limit, offset, total,
        count: rows.length, elapsedMs: Date.now() - t0,
        results: rows.map((r) => ({
          id: r.id, name: r.name, path: r.path, ext: r.ext, size: r.size,
          mtime: r.mtime, category: r.category, root: r.root, chars: r.chars,
          status: r.status, snippet: r.snip || '', score: r.score,
        })),
      };
    }, {
      ok: false, error: '索引尚未建立：' + DB_PATH,
      hint: '在插件面板点击「重建索引」，或运行 tools/build_kb.py',
      query: q, mode: 'fts', limit, offset, total: 0, count: 0, results: [],
    });
  }

  function get(opts = {}) {
    const id = Number(opts.id);
    if (!Number.isFinite(id)) return { ok: false, error: '缺少 id' };
    const max = Math.max(200, Math.min(Number(opts.max) || 8000, 40000));
    return withDb((db) => {
      const row = db.prepare('SELECT * FROM docs WHERE id = ?').get(id);
      if (!row) return { ok: false, error: '未找到该文档 id=' + id };
      const body = String(row.body || '');
      return {
        ok: true, id, name: row.name, path: row.path, ext: row.ext, size: row.size,
        mtime: row.mtime, category: row.category, root: row.root, status: row.status,
        note: row.note, bodyChars: body.length, bodyTruncated: body.length > max,
        body: body.slice(0, max),
      };
    }, dbError('索引尚未建立：' + DB_PATH));
  }

  function filePath(opts = {}) {
    const id = Number(opts.id);
    if (!Number.isFinite(id)) return { ok: false, error: '缺少 id' };
    return withDb((db) => {
      const row = db.prepare('SELECT path FROM docs WHERE id = ?').get(id);
      return row ? { ok: true, id, path: row.path } : { ok: false, error: '未找到该文档 id=' + id };
    }, dbError('索引尚未建立：' + DB_PATH));
  }

  function windowsPath(p) {
    return String(p || '').replace(/\//g, '\\');
  }

  function reveal(opts = {}) {
    const r = filePath(opts);
    if (!r.ok) return r;
    try {
      spawn('explorer.exe', ['/select,', windowsPath(r.path)], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  function open(opts = {}) {
    const r = filePath(opts);
    if (!r.ok) return r;
    try {
      spawn('explorer.exe', [windowsPath(r.path)], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  function rebuildStatus() {
    return { ...state };
  }

  function rebuild(opts = {}) {
    if (state.running) return { ok: false, error: '已有一次重建正在进行', ...state };
    const cfg = writeConfig({ ...readConfig(), ...opts });
    const python = resolvePython(cfg);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(STAGING_DB + suffix); } catch { /* ignore */ }
    }
    const args = [
      BUILDER, '--db', STAGING_DB, '--roots', cfg.roots,
      '--max-chars', String(cfg.maxChars), '--max-bytes', String(cfg.maxBytes),
      '--report', REPORT_PATH,
    ];
    let log = '';
    const keep = (chunk) => { log = (log + chunk.toString('utf8')).slice(-8000); };
    let child;
    try {
      child = spawn(python, args, {
        cwd: TOOLS_DIR,
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
    Object.assign(state, {
      running: true, startedAt: Date.now(), finishedAt: 0, ok: null,
      error: '', logTail: '', report: null, python,
    });
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);
    child.on('error', (error) => {
      Object.assign(state, { running: false, finishedAt: Date.now(), ok: false,
        error: String(error?.message || error), logTail: log });
    });
    child.on('close', (code) => {
      state.finishedAt = Date.now();
      state.logTail = log;
      state.running = false;
      if (code !== 0 || !fs.existsSync(STAGING_DB)) {
        state.ok = false;
        state.error = state.error || `构建进程退出码 ${code}，索引未更新（旧索引仍可用）`;
        return;
      }
      try {
        // Replace atomically-ish: queries open a fresh read-only handle each
        // time, so there is no long-lived lock on the old file.
        for (const suffix of ['-wal', '-shm']) {
          try { fs.unlinkSync(DB_PATH + suffix); } catch { /* ignore */ }
        }
        try { fs.unlinkSync(DB_PATH); } catch { /* ignore */ }
        fs.renameSync(STAGING_DB, DB_PATH);
        try { state.report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')); } catch { /* ignore */ }
        state.ok = true;
      } catch (error) {
        state.ok = false;
        state.error = '替换索引失败：' + String(error?.message || error);
      }
    });
    return { ok: true, started: true, python, db: DB_PATH };
  }

  return { stats, search, get, path: filePath, reveal, open, rebuild, rebuildStatus,
    readConfig, writeConfig, configPath: CONFIG_PATH, dbPath: DB_PATH };
}

// ---------------------------------------------------------------- HTTP API
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJson(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) reject(new Error('请求体太大'));
    });
    req.on('end', () => {
      try { resolve(raw.trim() ? JSON.parse(raw) : {}); }
      catch { reject(new Error('请求体不是合法 JSON')); }
    });
    req.on('error', reject);
  });
}

export function apiHandler(backend) {
  return async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const route = url.pathname.slice(API_PREFIX.length).replace(/^\/+/, '').replace(/\/+$/, '');
    const method = String(req.method || 'GET').toUpperCase();
    const q = url.searchParams;
    const opts = (extra = {}) => Object.fromEntries(q.entries());
    try {
      if (route === 'health' && method === 'GET') {
        sendJson(res, 200, { ok: true, version: VERSION, now: Date.now(),
          db: backend.dbPath, dbExists: fs.existsSync(backend.dbPath),
          config: backend.readConfig() });
        return;
      }
      if (route === 'stats' && method === 'GET') { sendJson(res, 200, backend.stats()); return; }
      if (route === 'search' && method === 'GET') { sendJson(res, 200, backend.search(opts())); return; }
      if (route === 'doc' && method === 'GET') { sendJson(res, 200, backend.get(opts())); return; }
      if (route === 'path' && method === 'GET') { sendJson(res, 200, backend.path(opts())); return; }
      if (route === 'config' && method === 'GET') { sendJson(res, 200, { ok: true, config: backend.readConfig(), path: backend.configPath }); return; }
      if (route === 'config' && method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, { ok: true, config: backend.writeConfig(body || {}) });
        return;
      }
      if ((route === 'reveal' || route === 'open') && method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, backend[route](body || {}));
        return;
      }
      if (route === 'rebuild/status' && method === 'GET') { sendJson(res, 200, { ok: true, ...backend.rebuildStatus() }); return; }
      if (route === 'rebuild' && method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, backend.rebuild(body || {}));
        return;
      }
      sendJson(res, 404, { ok: false, error: '未知路由: ' + route });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) });
    }
  };
}

// ---------------------------------------------------------------- agent tool
function renderSearch(value) {
  if (!value?.ok) return [ { type: 'text', text: '本地知识库：' + (value?.error || '查询失败') } ];
  const lines = [
    `本地知识库 · 「${value.query}」 共 ${value.total} 条 (${value.mode}, ${value.elapsedMs}ms)，显示 ${value.count} 条：`,
  ];
  value.results.forEach((r, i) => {
    lines.push(`\n[${value.offset + i + 1}] ${r.name}  (${r.ext} · ${r.root} · ${r.chars}字)`);
    lines.push(`    ${r.path}`);
    if (r.snippet) lines.push(`    …${snippetText(r.snippet)}…`);
  });
  if (!value.results.length) lines.push('\n（无结果，试试更短的关键词或去掉筛选）');
  lines.push('\n提示：用 action=get 加 id 读取正文（默认截断 8000 字）；省 token，勿把整库读入上下文。');
  return [ { type: 'text', text: lines.join('\n') } ];
}

function renderGeneric(value) {
  if (!value) return [ { type: 'text', text: '（无结果）' } ];
  if (typeof value === 'string') return [ { type: 'text', text: value } ];
  if (value.body) {
    const head = `本地知识库 · 文档 ${value.id} 「${value.name}」\n${value.path}\n正文 ${value.bodyChars} 字${value.bodyTruncated ? '（已截断）' : ''}：\n\n`;
    return [ { type: 'text', text: head + value.body } ];
  }
  return [ { type: 'text', text: JSON.stringify(value, null, 2) } ];
}

export function toolDefinition(backend) {
  return {
    name: 'kb',
    description:
      'Search the local full-disk knowledge base (indexed PDF/Markdown/TXT/DOCX/PPTX/XLSX/EPUB/etc. from C: and E:). ' +
      'Returns short snippets only — never load whole documents into context unless action=get. ' +
      'Use action=search with a query; action=stats for index health; action=get with id for a capped body preview; ' +
      'action=path for the absolute path; action=rebuild to re-scan the disks (takes minutes, runs in background).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'stats', 'get', 'path', 'rebuild', 'rebuild-status'],
          description: 'search (default) | stats | get | path | rebuild | rebuild-status' },
        q: { type: 'string', description: 'Search phrase. Trigram FTS needs >=3 chars; shorter queries fall back to filename/head match.' },
        id: { type: 'number', description: 'Document id (for action=get / path).' },
        limit: { type: 'number', description: 'Max results, 1-100 (default 20).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' },
        ext: { type: 'string', description: 'Comma-separated extension filter, e.g. "pdf,md".' },
        category: { type: 'string', enum: ['personal', 'dev'], description: 'Filter by category.' },
        root: { type: 'string', description: 'Filter by drive, e.g. "C:" or "E:".' },
        max: { type: 'number', description: 'Max body chars for action=get (default 8000, cap 40000).' },
      },
      required: [],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => (_args?.action === 'search' || (!_args?.action) ? renderSearch(value) : renderGeneric(value)),
    },
    async execute(args = {}) {
      const action = args.action || 'search';
      switch (action) {
        case 'stats': return backend.stats();
        case 'get': return backend.get(args);
        case 'path': return backend.path(args);
        case 'rebuild': return backend.rebuild(args);
        case 'rebuild-status': return { ok: true, ...backend.rebuildStatus() };
        default: return backend.search(args);
      }
    },
  };
}

// ---------------------------------------------------------------- wiring
export function apply(ctx) {
  const backend = createBackend();
  ctx.effect(() => ctx.tools.register(toolDefinition(backend)), 'dsh-local-kb: kb tool');
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler: apiHandler(backend) }),
    'dsh-local-kb: local API');
}
