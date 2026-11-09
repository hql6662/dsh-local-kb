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
const VERSION = '0.2.0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(PKG_DIR, 'tools');
const BUILDER = path.join(TOOLS_DIR, 'build_kb.py');
const DATA_DIR = path.join(os.homedir(), '.dsh', 'local-kb');
const DB_PATH = path.join(DATA_DIR, 'kb.sqlite');
const STAGING_DB = path.join(DATA_DIR, 'kb.sqlite.building');
const REPORT_PATH = path.join(DATA_DIR, 'build_report.json');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
// AI / rule labels live in a SEPARATE database keyed by path, so they survive
// a full index rebuild (doc ids shift, paths don't). Read via ATTACH.
const LABELS_DB = path.join(DATA_DIR, 'labels.sqlite');
const USEFUL_VALUES = ['high', 'possible', 'low'];
const TOPIC_VALUES = ['study', 'work', 'code', 'life', 'reference', 'other'];

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

function ensureLabelsDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(LABELS_DB);
  db.exec(`CREATE TABLE IF NOT EXISTS labels(
    path TEXT PRIMARY KEY, useful TEXT, topic TEXT, why TEXT,
    src TEXT DEFAULT 'ai', ts INTEGER
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT)`);
  db.close();
}

// Small key/value store next to the labels: remembers whether the generous
// first full pass already happened, so later rebuilds can review cheaply.
function readState() {
  const out = {};
  try {
    ensureLabelsDb();
    const db = new DatabaseSync(LABELS_DB);
    for (const row of db.prepare('SELECT key, value FROM state').all()) out[row.key] = row.value;
    db.close();
  } catch { /* ignore */ }
  return out;
}

function writeState(patch) {
  try {
    ensureLabelsDb();
    const db = new DatabaseSync(LABELS_DB);
    const stmt = db.prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(patch)) stmt.run(String(k), String(v));
    db.close();
    return true;
  } catch { return false; }
}

function labelsSqlPath() {
  return LABELS_DB.replace(/\\/g, '/').replace(/'/g, "''");
}

// Open the (immutable) index read-only, ATTACH the writable labels DB, and
// expose a TEMP VIEW vdoc = docs + merged labels. Falling back to a rule-only
// / plain view keeps the plugin working against an older index that predates
// the rule_* columns. 省 token: no document bodies are read here.
function openDb(file = DB_PATH, withLabels = true) {
  if (!fs.existsSync(file)) return null;
  const db = new DatabaseSync(file, { readOnly: true });
  if (!withLabels) return db;
  // Detect whether this index has the rule_* columns (version 3+). Older
  // v2 indexes do not, so coalesce() on them would fail at SELECT time.
  let hasRules = false;
  try {
    const cols = db.prepare('PRAGMA table_info(docs)').all().map((r) => String(r.name));
    hasRules = cols.includes('rule_useful') && cols.includes('rule_topic');
  } catch { /* keep false */ }
  let attached = false;
  try {
    ensureLabelsDb();
    db.exec("ATTACH DATABASE '" + labelsSqlPath() + "' AS lb");
    attached = true;
  } catch { /* labels unavailable -> rule-only view below */ }
  const usefulExpr = hasRules ? "coalesce(l.useful, d.rule_useful, 'possible')" : "coalesce(l.useful, 'possible')";
  const topicExpr = hasRules ? "coalesce(l.topic,  d.rule_topic,  'other')" : "coalesce(l.topic, 'other')";
  if (attached) {
    try {
      db.exec(`CREATE TEMP VIEW vdoc AS
        SELECT d.*,
          ${usefulExpr} AS useful,
          ${topicExpr}  AS topic,
          coalesce(l.why, '') AS label_why,
          case when l.path is null then 'rule' else 'ai' end AS label_src,
          coalesce(l.ts, 0) AS label_ts
        FROM docs d LEFT JOIN lb.labels l ON l.path = d.path`);
      return db;
    } catch { /* attached view failed -> plain fallbacks below */ }
  }
  try {
    db.exec(`CREATE TEMP VIEW vdoc AS
      SELECT d.*,
        ${hasRules ? "coalesce(d.rule_useful, 'possible')" : "'possible'"} AS useful,
        ${hasRules ? "coalesce(d.rule_topic,  'other')" : "'other'"}    AS topic,
        '' AS label_why, 'rule' AS label_src, 0 AS label_ts
      FROM docs d`);
  } catch {
    db.exec(`CREATE TEMP VIEW vdoc AS
      SELECT d.*, 'possible' AS useful, 'other' AS topic,
        '' AS label_why, 'rule' AS label_src, 0 AS label_ts FROM docs d`);
  }
  return db;
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
      const groupV = (col) => {
        try {
          return Object.fromEntries(
            db.prepare(`SELECT ${col} AS k, count(*) AS n FROM vdoc GROUP BY ${col} ORDER BY n DESC`).all()
              .map((r) => [String(r.k), r.n]));
        } catch { return {}; }
      };
      let aiLabels = 0;
      try { aiLabels = db.prepare('SELECT count(*) AS n FROM lb.labels').get().n; } catch { /* ignore */ }
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
        byUseful: groupV('useful'),
        byTopic: groupV('topic'),
        byLabelSrc: groupV('label_src'),
        aiLabels: aiLabels,
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
    if (opts.path) {
      const sub = String(opts.path).trim();
      if (sub) { sql += ' AND instr(lower(d.path), lower(?)) > 0'; params.push(sub); }
    }
    if (opts.days) {
      const d = Number(opts.days);
      if (Number.isFinite(d) && d > 0) {
        sql += ' AND d.mtime >= ?';
        params.push(Date.now() / 1000 - d * 86400);
      }
    }
    if (opts.useful) {
      const vals = String(opts.useful).split(',').map((v) => v.trim()).filter((v) => USEFUL_VALUES.includes(v));
      if (vals.length) { sql += ` AND d.useful IN (${vals.map(() => '?').join(',')})`; params.push(...vals); }
    }
    if (opts.topic) {
      const vals = String(opts.topic).split(',').map((v) => v.trim()).filter((v) => TOPIC_VALUES.includes(v));
      if (vals.length) { sql += ` AND d.topic IN (${vals.map(() => '?').join(',')})`; params.push(...vals); }
    }
    if (opts.labelSrc === 'ai') sql += " AND d.label_src = 'ai'";
    if (opts.labelSrc === 'rule') sql += " AND d.label_src = 'rule'";
    return sql;
  }

  const COLS = 'd.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,d.chars,d.status,d.head,' +
    'd.useful,d.topic,d.label_src,d.label_why';

  function orderBy(mode, sort) {
    if (sort === 'name') return 'd.name COLLATE NOCASE';
    if (sort === 'mtime') return 'd.mtime DESC';
    return mode === 'fts' ? 'rank' : 'd.mtime DESC';
  }

  function likeEsc(q) {
    return '%' + String(q).replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_') + '%';
  }

  function search(opts = {}) {
    const q = String(opts.q || '').trim();
    const limit = Math.max(1, Math.min(Number(opts.limit) || 20, 100));
    const offset = Math.max(0, Number(opts.offset) || 0);
    const sort = ['relevance', 'mtime', 'name'].includes(String(opts.sort)) ? String(opts.sort) : '';
    const t0 = Date.now();
    const fallback = {
      ok: false, error: '索引尚未建立：' + DB_PATH,
      hint: '在插件面板点击重建索引，或运行 tools/build_kb.py',
      query: q, mode: q ? 'fts' : 'browse', limit, offset, total: 0, count: 0, results: [],
    };
    return withDb((db) => {
      const toResult = (r) => ({
        id: r.id, name: r.name, path: r.path, ext: r.ext, size: r.size,
        mtime: r.mtime, category: r.category, root: r.root, chars: r.chars,
        status: r.status, snippet: r.snip || '', score: r.score,
        useful: r.useful || 'possible', topic: r.topic || 'other',
        labelSrc: r.label_src || 'rule', labelWhy: r.label_why || '',
      });

      // BROWSE: no keyword. A token-efficient timeline of recent files,
      // with ext/category/root/path/days filters. Snippets come from head.
      if (!q) {
        const params = [];
        const extra = filters(opts, params);
        const ob = orderBy('browse', sort);
        const rows = db.prepare(
          'SELECT ' + COLS + ',NULL AS snip,0 AS score FROM vdoc d WHERE 1=1' + extra +
          ' ORDER BY ' + ob + ' LIMIT ? OFFSET ?').all(...params, limit, offset);
        rows.forEach((r) => { r.snip = String(r.head || r.name || '').slice(0, 160); });
        let total = rows.length + offset;
        try {
          const cparams = [];
          const cextra = filters(opts, cparams);
          total = db.prepare('SELECT count(*) AS n FROM vdoc d WHERE 1=1' + cextra).get(...cparams).n;
        } catch { /* keep lower bound */ }
        return {
          ok: true, query: '', mode: 'browse', limit, offset, total,
          count: rows.length, elapsedMs: Date.now() - t0,
          results: rows.map(toResult),
        };
      }

      // SEARCH: FTS5 over name + body + path (so directory names count).
      const params = [phrase(q)];
      const extra = filters(opts, params);
      let rows = [];
      let mode = 'fts';
      if (q.length >= 3) {
        const sql =
          'SELECT ' + COLS + ',' +
          "snippet(fts,1,char(1),char(2),'…',36) AS snip,bm25(fts,1.0,1.0) AS score " +
          'FROM fts JOIN vdoc d ON d.id = fts.rowid WHERE fts MATCH ?' + extra +
          ' ORDER BY ' + orderBy('fts', sort) + ' LIMIT ? OFFSET ?';
        try { rows = db.prepare(sql).all(...params, limit, offset); }
        catch { rows = []; }
        if (!rows.length) mode = 'like';
      } else {
        mode = 'like';
      }
      if (mode === 'like') {
        const like = likeEsc(q);
        const lparams = [like, like];
        const lextra = filters(opts, lparams);
        const sql =
          'SELECT ' + COLS + ',NULL AS snip, 0 AS score FROM vdoc d ' +
          "WHERE (d.name LIKE ? ESCAPE '!' OR d.head LIKE ? ESCAPE '!')" + lextra +
          ' ORDER BY ' + orderBy('like', sort) + ' LIMIT ? OFFSET ?';
        rows = db.prepare(sql).all(...lparams, limit, offset);
        rows = rows.map((r) => ({ ...r, snip: String(r.head || r.name || '').slice(0, 160) }));
      }
      let total = rows.length + offset;
      try {
        if (mode === 'fts') {
          const tparams = [phrase(q)];
          const textra = filters(opts, tparams);
          total = db.prepare('SELECT count(*) AS n FROM fts JOIN vdoc d ON d.id = fts.rowid WHERE fts MATCH ?' + textra)
            .get(...tparams).n;
        } else {
          const like = likeEsc(q);
          const lp = [like, like];
          const le = filters(opts, lp);
          total = db.prepare("SELECT count(*) AS n FROM vdoc d WHERE (d.name LIKE ? ESCAPE '!' OR d.head LIKE ? ESCAPE '!')" + le)
            .get(...lp).n;
        }
      } catch { /* keep lower bound */ }
      return {
        ok: true, query: q, mode, limit, offset, total,
        count: rows.length, elapsedMs: Date.now() - t0,
        results: rows.map(toResult),
      };
    }, fallback);
  }

  function get(opts = {}) {
    const id = Number(opts.id);
    if (!Number.isFinite(id)) return { ok: false, error: '缺少 id' };
    const max = Math.max(200, Math.min(Number(opts.max) || 8000, 40000));
    return withDb((db) => {
      const row = db.prepare('SELECT * FROM vdoc WHERE id = ?').get(id);
      if (!row) return { ok: false, error: '未找到该文档 id=' + id };
      const body = String(row.body || '');
      return {
        ok: true, id, name: row.name, path: row.path, ext: row.ext, size: row.size,
        mtime: row.mtime, category: row.category, root: row.root, status: row.status,
        note: row.note, useful: row.useful || 'possible', topic: row.topic || 'other',
        labelSrc: row.label_src || 'rule', labelWhy: row.label_why || '',
        bodyChars: body.length, bodyTruncated: body.length > max,
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
        try { writeState({ lastRebuildTs: String(Date.now()) }); } catch { /* ignore */ }
      } catch (error) {
        state.ok = false;
        state.error = '替换索引失败：' + String(error?.message || error);
      }
    });
    return { ok: true, started: true, python, db: DB_PATH };
  }

  // ------------------------------------------------------------ AI labels
  // Two review modes on purpose:
  //   full        — the FIRST pass over a fresh index. Token cost is not a
  //                 concern: every doc is offered (short ones too, and already
  //                 AI-labelled ones so rules can be corrected), larger batches,
  //                 longer heads, and the Agent may read a body when unsure.
  //   incremental — every pass after a rebuild. Only docs with NO AI label yet
  //                 (new or changed files), head only, small batch: cheap.
  // Defaults to `full` until the first pass is recorded as done.
  function candidateMode(opts = {}) {
    const want = String(opts.mode || 'auto').toLowerCase();
    if (want === 'full' || want === 'incremental') return want;
    return readState().firstPassDone === '1' ? 'incremental' : 'full';
  }

  function candidates(opts = {}) {
    const mode = candidateMode(opts);
    const full = mode === 'full';
    const limit = Math.max(1, Math.min(Number(opts.limit) || (full ? 50 : 30), full ? 200 : 100));
    const offset = Math.max(0, Number(opts.offset) || 0);
    const q = String(opts.q || '').trim();
    const minCharsRaw = opts.minChars != null ? opts.minChars : (full ? 0 : 200);
    const minChars = Math.max(0, Number(minCharsRaw) || 0);
    const includeAi = opts.includeAi != null ? !!opts.includeAi : full;
    const headChars = full ? 400 : 200;
    const t0 = Date.now();

    const build = (forCount) => {
      const params = [];
      let sql = (forCount
        ? 'SELECT count(*) AS n FROM vdoc d WHERE 1=1'
        : ('SELECT d.id,d.name,d.path,d.ext,d.chars,d.mtime,d.useful,d.topic,d.label_src,' +
           (full ? 'substr(d.body,1,400)' : 'd.head') + ' AS head FROM vdoc d WHERE 1=1'));
      sql += filters(opts, params);
      if (!includeAi) sql += " AND d.label_src = 'rule'";
      if (!full && !opts.useful) sql += " AND d.useful = 'possible'";
      sql += ' AND d.chars >= ?'; params.push(minChars);
      if (q) { sql += ' AND (instr(lower(d.path), lower(?)) > 0 OR instr(lower(d.name), lower(?)) > 0)'; params.push(q, q); }
      if (!forCount) {
        // Full pass reviews the promising stuff first (high value, then large),
        // so stopping early still leaves the useful half classified.
        sql += full ? " ORDER BY CASE d.useful WHEN 'high' THEN 0 WHEN 'possible' THEN 1 ELSE 2 END, d.chars DESC, d.mtime DESC LIMIT ? OFFSET ?"
                    : ' ORDER BY d.mtime DESC, d.chars DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }
      return { sql, params };
    };

    return withDb((db) => {
      const sel = build(false);
      const rows = db.prepare(sel.sql).all(...sel.params);
      const cnt = build(true);
      let total = rows.length + offset;
      try { total = db.prepare(cnt.sql).get(...cnt.params).n; } catch { /* lower bound */ }
      return {
        ok: true, mode, limit, offset, total, count: rows.length, elapsedMs: Date.now() - t0,
        firstPassDone: readState().firstPassDone === '1',
        results: rows.map((r) => ({
          id: r.id, name: r.name, path: r.path, ext: r.ext, chars: r.chars,
          mtime: r.mtime, useful: r.useful, topic: r.topic,
          labelSrc: r.label_src, head: String(r.head || '').slice(0, headChars),
        })),
      };
    }, dbError('索引尚未建立：' + DB_PATH));
  }

  // How much review is left and whether the thorough first pass already ran.
  function labelStatus() {
    const st = readState();
    return withDb((db) => {
      const n = (sql, args = []) => { try { return db.prepare(sql).get(...args).n; } catch { return 0; } };
      const pending = n("SELECT count(*) AS n FROM vdoc d WHERE d.label_src = 'rule' AND d.chars >= 200");
      const pendingNew = n("SELECT count(*) AS n FROM vdoc d WHERE d.label_src = 'rule' AND d.chars >= 200 AND d.mtime >= ?",
        [Number(st.lastRebuildTs || 0)]);
      return {
        ok: true,
        firstPassDone: st.firstPassDone === '1',
        firstPassAt: Number(st.firstPassAt || 0),
        lastRebuildTs: Number(st.lastRebuildTs || 0),
        mode: candidateMode({}),
        aiLabeled: n('SELECT count(*) AS n FROM lb.labels'),
        pending, pendingNew,
        labelsPath: LABELS_DB,
      };
    }, dbError('索引尚未建立：' + DB_PATH));
  }

  // Record that the thorough pass is over so later rebuilds go incremental.
  function markFirstPass(opts = {}) {
    const reset = !!opts.reset;
    const at = Date.now();
    writeState(reset ? { firstPassDone: '0', firstPassAt: '0' }
                     : { firstPassDone: '1', firstPassAt: String(at) });
    return { ok: true, firstPassDone: !reset, firstPassAt: reset ? 0 : at };
  }

  // Write (or overwrite) labels. Accepts a batch `items` array; each item has
  // `id` or `path`, plus useful / topic / why. 省 token: ONE call labels many.
  function setLabels(opts = {}) {
    const raw = Array.isArray(opts.items) ? opts.items
      : (opts.id != null || opts.path ? [opts] : []);
    if (!raw.length) return { ok: false, error: '缺少 items（或 id/path）' };
    const ids = raw.filter((it) => it.id != null && !it.path).map((it) => Number(it.id));
    let resolved = {};
    if (ids.length) {
      const r = withDb((db) => {
        const out = {};
        for (const row of db.prepare(`SELECT id,path FROM docs WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)) {
          out[row.id] = row.path;
        }
        return out;
      }, null);
      if (r && r.ok === false) return r;
      resolved = r || {};
    }
    const rows = [];
    for (const it of raw) {
      const p = it.path || resolved[it.id];
      if (!p) continue;
      const useful = USEFUL_VALUES.includes(it.useful) ? it.useful : null;
      const topic = TOPIC_VALUES.includes(it.topic) ? it.topic : null;
      if (!useful && !topic) continue;
      rows.push({ path: String(p), useful, topic, why: String(it.why || '').slice(0, 300), src: String(it.src || 'ai') });
    }
    if (!rows.length) return { ok: false, error: '没有可写入的有效标注（需 id/path + useful/topic）' };
    try {
      ensureLabelsDb();
      const db = new DatabaseSync(LABELS_DB);
      const stmt = db.prepare(`INSERT INTO labels(path,useful,topic,why,src,ts)
        VALUES(?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET
          useful=coalesce(excluded.useful,labels.useful),
          topic=coalesce(excluded.topic,labels.topic),
          why=excluded.why, src=excluded.src, ts=excluded.ts`);
      const now = Date.now();
      for (const r of rows) stmt.run(r.path, r.useful, r.topic, r.why, r.src, now);
      db.close();
      return { ok: true, written: rows.length, labelsPath: LABELS_DB };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  // Deleting labels is destructive and irreversible, so it never happens
  // silently: unless `force` is passed, this only reports what WOULD be
  // removed and how to actually do it. With `force`, the rows are written to a
  // timestamped .json backup first (they are recoverable from that file).
  function clearLabels(opts = {}) {
    try {
      ensureLabelsDb();
      const db = new DatabaseSync(LABELS_DB);
      const src = opts.src ? String(opts.src) : '';
      const where = src ? 'WHERE src = ?' : '';
      const args = src ? [src] : [];
      const count = db.prepare('SELECT count(*) AS n FROM labels ' + where).get(...args).n;
      if (!count) { db.close(); return { ok: true, deleted: 0 }; }

      if (!opts.force) {
        db.close();
        return {
          ok: false, requiresForce: true, wouldDelete: count,
          error: '这会删除 ' + count + ' 条 AI 标注，需要显式确认',
          hint: '确认无误后重发一次并带 force:true（API 里是 {"clear":true,"src":"ai","force":true}）。'
            + '不带 src 会清空全部标注；通常你只想清掉测试写的那几条——那种情况请用 action=label 覆盖它们，而不是清库。',
        };
      }

      let backup = '';
      try {
        const rows = db.prepare('SELECT * FROM labels ' + where).all(...args);
        backup = LABELS_DB + '.backup-' + Date.now() + '.json';
        fs.writeFileSync(backup, JSON.stringify(rows, null, 1), 'utf8');
      } catch { /* backup is best-effort; the request was explicit */ }

      db.prepare('DELETE FROM labels ' + where).run(...args);
      db.close();
      return { ok: true, deleted: count, backup };
    } catch (error) { return { ok: false, error: String(error?.message || error) }; }
  }

  return { stats, search, get, path: filePath, reveal, open, rebuild, rebuildStatus,
    candidates, setLabels, clearLabels, labelStatus, markFirstPass,
    labelsPath: LABELS_DB,
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
      if ((route === 'search' || route === 'browse') && method === 'GET') {
        sendJson(res, 200, backend.search(opts())); return;
      }
      if (route === 'candidates' && method === 'GET') { sendJson(res, 200, backend.candidates(opts())); return; }
      if (route === 'labels/status' && method === 'GET') { sendJson(res, 200, backend.labelStatus()); return; }
      if (route === 'labels/first-pass' && method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, backend.markFirstPass(body || {}));
        return;
      }
      if (route === 'labels' && method === 'GET') {
        sendJson(res, 200, { ok: true, path: backend.labelsPath, stats: backend.stats().byLabelSrc || {}, count: backend.stats().aiLabels || 0 }); return;
      }
      if (route === 'labels' && method === 'POST') {
        const body = await readJson(req);
        if (body && body.clear) sendJson(res, 200, backend.clearLabels(body || {}));
        else sendJson(res, 200, backend.setLabels(body || {}));
        return;
      }
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
    value.mode === 'browse'
      ? `本地知识库 · 浏览最近文件 共 ${value.total} 条 (${value.elapsedMs}ms)，显示 ${value.count} 条：`
      : `本地知识库 · 「${value.query}」 共 ${value.total} 条 (${value.mode}, ${value.elapsedMs}ms)，显示 ${value.count} 条：`,
  ];
  value.results.forEach((r, i) => {
    lines.push(`\n[${value.offset + i + 1}] ${r.name}  (${r.ext} · ${r.root} · ${r.chars}字 · ${r.useful || '?'}/${r.topic || '?'}${r.labelSrc === 'ai' ? ' · AI' : ''})`);
    lines.push(`    ${r.path}`);
    if (r.snippet) lines.push(`    …${snippetText(r.snippet)}…`);
  });
  if (!value.results.length) lines.push('\n（无结果，试试更短的关键词或去掉筛选）');
  lines.push('\n提示：用 action=get 加 id 读取正文（默认截断 8000 字）；省 token，勿把整库读入上下文。');
  return [ { type: 'text', text: lines.join('\n') } ];
}

function renderCandidates(value) {
  if (!value?.ok) return [ { type: 'text', text: '本地知识库：' + (value?.error || '候选获取失败') } ];
  const full = value.mode === 'full';
  const lines = [full
    ? `本地知识库 · 首次全量识别（mode=full）：共 ${value.total} 条待复核，本次 ${value.count} 条。这一轮不必省 token，看不出时可用 action=get 读正文。`
    : `本地知识库 · 增量识别（mode=incremental）：共 ${value.total} 条新文件待识别，本次 ${value.count} 条（只含路径/开头片段，省 token）。`];
  value.results.forEach((r, i) => {
    lines.push(`\n[${value.offset + i + 1}] id=${r.id} ${r.name} (${r.ext} · ${r.chars}字 · ${r.useful}/${r.topic}${r.labelSrc === 'ai' ? ' · 已有AI标注' : ''})`);
    lines.push(`    ${r.path}`);
    if (r.head) lines.push(`    开头：${r.head.slice(0, full ? 300 : 120)}`);
  });
  lines.push('\n判断后调用 action=label 提交批量标注：items:[{id,useful,topic,why}]。');
  return [ { type: 'text', text: lines.join('\n') } ];
}

function renderLabelStatus(value) {
  if (!value?.ok) return [ { type: 'text', text: '本地知识库：' + (value?.error || '状态获取失败') } ];
  return [ { type: 'text', text: [
    '本地知识库 · 内容识别状态',
    `首次全量识别：${value.firstPassDone ? '已完成' : '尚未完成'}` + (value.firstPassAt ? `（${new Date(value.firstPassAt).toLocaleString('zh-CN')}）` : ''),
    `当前候选模式：${value.mode}（${value.mode === 'full' ? '可放开 token，必要时读正文' : '省 token，只处理新增文件'}）`,
    `已有 AI 标注：${value.aiLabeled} 篇`,
    `待复核总数：${value.pending} 篇  ·  上次重建后新增：${value.pendingNew} 篇`,
    `标注文件：${value.labelsPath}`,
  ].join('\n') } ];
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
      'Search or BROWSE the local full-disk knowledge base (indexed PDF/Markdown/TXT/Word/PPT/Excel/EPUB/MOBI/CHM/RTF/etc. from C: and E:). ' +
      'Returns short snippets only — never load whole documents into context unless action=get. ' +
      'Full-text index covers name + body + path (so directory names are searchable). ' +
      'action=search with q for a query; OMIT q (or action=browse) for a no-keyword timeline of recent files; ' +
      'action=stats for index health; action=get with id for a capped body preview; ' +
      'action=path for the absolute path; action=rebuild to re-scan the disks (takes minutes, runs in background). ' +
      'CONTENT CLASSIFICATION: every doc has two tags — useful (high|possible|low) and topic (study|work|code|life|reference|other) — ' +
      'zero-cost rule baseline, overridable by AI. action=candidates lists a token-efficient batch of UNCERTAIN docs (id/path/head only, no bodies) for you to judge; ' +
      'then action=label with items:[{id,useful,topic,why}] writes AI labels in ONE call (survives rebuilds, keyed by path). ' +
      'TWO-TIER REVIEW: the FIRST pass after a fresh index is thorough (mode=full: batch 50, no length floor, heads 400 chars) — ' +
      'there token cost is NOT a concern and you MAY call action=get for a longer body when the head is not enough. ' +
      'EVERY LATER pass is cheap (mode=incremental): only docs that still carry no AI label (new or changed since the last pass), head only, small batches. ' +
      'action=label-status reports the current mode, total pending and pending since the last rebuild; pass reset=false to record that the thorough pass is finished (the panel does it automatically). ' +
      'action=labels shows label health; action=clear-labels resets AI labels. ' +
      'Filters: ext, category, root, path (substring), days (modified within N days), sort (relevance|mtime|name), useful, topic, labelSrc(ai|rule).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'browse', 'stats', 'get', 'path', 'rebuild', 'rebuild-status', 'candidates', 'label', 'labels', 'label-status', 'clear-labels'],
          description: 'search (default) | browse (no keyword) | stats | get | path | rebuild | rebuild-status | candidates (AI review batch) | label (write batch) | labels | label-status (first-pass / pending counts) | clear-labels' },
        q: { type: 'string', description: 'Search phrase matching name + body + path. Trigram FTS needs >=3 chars; shorter queries fall back to filename/head match. Omit for browse (recent files).' },
        id: { type: 'number', description: 'Document id (for action=get / path).' },
        limit: { type: 'number', description: 'Max results, 1-100 (default 20).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' },
        ext: { type: 'string', description: 'Comma-separated extension filter, e.g. "pdf,md".' },
        category: { type: 'string', enum: ['personal', 'dev'], description: 'Filter by category.' },
        root: { type: 'string', description: 'Filter by drive, e.g. "C:" or "E:".' },
        path: { type: 'string', description: 'Filter by a substring of the full path / folder name (e.g. "Desktop", "实验三", "xwechat").' },
        days: { type: 'number', description: 'Only files modified within the last N days (e.g. 7).' },
        sort: { type: 'string', enum: ['relevance', 'mtime', 'name'], description: 'Sort order: relevance (default for search), mtime (newest first), name (A-Z).' },
        max: { type: 'number', description: 'Max body chars for action=get (default 8000, cap 40000).' },
        useful: { type: 'string', enum: ['high', 'possible', 'low'], description: 'Filter by usefulness tag (comma-separated also accepted in search).' },
        topic: { type: 'string', enum: ['study', 'work', 'code', 'life', 'reference', 'other'], description: 'Filter by topic tag.' },
        labelSrc: { type: 'string', enum: ['ai', 'rule'], description: 'Filter by label origin: AI-labeled vs rule-baseline.' },
        items: { type: 'array', description: 'For action=label: [{id, useful, topic, why}] batch. ONE call labels many — 省 token.', items: { type: 'object' } },
        why: { type: 'string', description: 'Short reason for an AI label (for action=label single-item form).' },
        includeAi: { type: 'boolean', description: 'For action=candidates: include already-AI-labeled docs (default true in full mode, false in incremental).' },
        mode: { type: 'string', enum: ['auto', 'full', 'incremental'], description: 'For action=candidates: full = thorough FIRST pass (every doc incl. short/already-labelled, batch up to 200, heads 400 chars, bodies may be read when unsure; token cost is NOT a concern); incremental = cheap pass after a rebuild (only docs with no AI label yet, head only). auto = full until the first pass is recorded done.' },
        reset: { type: 'boolean', description: 'For action=label-status: reset the first-pass flag so the next candidates call is thorough again.' },
        force: { type: 'boolean', description: 'For action=clear-labels: actually delete the AI labels. Without it the call only reports how many would be removed. Prefer overwriting a few bad labels with action=label instead of wiping the table.' },
        minChars: { type: 'number', description: 'For action=candidates: minimum body chars (default 200).' },
        q2: { type: 'string', description: 'For action=candidates: optional path/name substring to narrow the batch.' },
      },
      required: [],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => {
        const a = _args?.action;
        if (a === 'candidates') return renderCandidates(value);
        if (a === 'label-status') return renderLabelStatus(value);
        if (!a || a === 'search' || a === 'browse') return renderSearch(value);
        return renderGeneric(value);
      },
    },
    async execute(args = {}) {
      const action = args.action || 'search';
      switch (action) {
        case 'stats': return backend.stats();
        case 'get': return backend.get(args);
        case 'path': return backend.path(args);
        case 'rebuild': return backend.rebuild(args);
        case 'rebuild-status': return { ok: true, ...backend.rebuildStatus() };
        case 'candidates': return backend.candidates({ ...args, q: args.q2 || args.q });
        case 'label-status': return args.reset ? backend.markFirstPass({ reset: true }) : backend.labelStatus();
        case 'label': return backend.setLabels(args);
        case 'labels': return { ok: true, path: backend.labelsPath, ...backend.stats() };
        case 'clear-labels': return backend.clearLabels(args);
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
