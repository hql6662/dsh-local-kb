// Smoke test for the dsh-local-kb host module (pure query layer + routes).
// Runs with the DSH bundled Node (node:sqlite available). No DSH ctx needed.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NS = 'dsh-local-kb';
const API_PREFIX = '/local-kb/api';

function phrase(q) {
  return '"' + (q || '').trim().replace(/"/g, '""') + '"';
}
assert.equal(phrase('知识库'), '"知识库"');
assert.equal(phrase('a"b'), '"a""b"');

// Verify trigram FTS on a disposable in-memory DB built exactly like build_kb.py.
const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE docs(id INTEGER PRIMARY KEY, name TEXT, body TEXT, head TEXT, path TEXT,
  ext TEXT, size INT, mtime REAL, category TEXT, root TEXT, chars INT, status TEXT, note TEXT);
CREATE VIRTUAL TABLE fts USING fts5(name, body, content='docs', content_rowid='id', tokenize='trigram');
INSERT INTO docs(id,name,body,head,path,ext,size,mtime,category,root,chars,status,note)
  VALUES(1,'kb.md','本地知识库整合了 PDF 与 Markdown 文档','本地知识库整合了 PDF','C:/kb.md','md',100,1,'personal','C:',18,'ok','');
INSERT INTO docs(id,name,body,head,path,ext,size,mtime,category,root,chars,status,note)
  VALUES(2,'paper.pdf','HarnessMM reduces harness token cost','HarnessMM reduces','E:/paper.pdf','pdf',200,2,'personal','E:',30,'ok','pages:37');
INSERT INTO fts(fts) VALUES('rebuild');
`);
const rows = db.prepare(
  "SELECT d.id,d.name,d.path,snippet(fts,1,char(1),char(2),'…',36) AS snip,bm25(fts,1.0,1.0) AS score " +
  'FROM fts JOIN docs d ON d.id=fts.rowid WHERE fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?'
).all(phrase('知识库'), 20, 0);
assert.equal(rows.length, 1, 'trigram phrase should match Chinese substring');
assert.ok(rows[0].snip.includes('知识库'), 'snippet should contain the query');
const filtered = db.prepare(
  'SELECT d.id FROM fts JOIN docs d ON d.id=fts.rowid WHERE fts MATCH ? AND d.ext = ?'
).all(phrase('HarnessMM'), 'pdf');
assert.equal(filtered.length, 1, 'ext filter should work');
const got = db.prepare('SELECT count(*) AS n FROM docs').get();
assert.equal(got.n, 2, '.get() variadic/return shape');
db.close();

// Load the real host module: it must not touch ctx until apply() is called.
const mod = await import(pathToFileURL(path.join(__dirname, '..', 'host', 'kb.js')).href);
assert.equal(typeof mod.apply, 'function', 'host module must export apply(ctx)');
assert.equal(typeof mod.createBackend, 'function');
assert.equal(typeof mod.apiHandler, 'function');
assert.equal(typeof mod.toolDefinition, 'function');
assert.equal(mod.name, NS);

// Exercise the real backend against the on-disk full index, if present.
const backend = mod.createBackend();
assert.equal(typeof backend.stats, 'function');
const stats = backend.stats();
assert.equal(stats.ok, true, 'stats against real index: ' + JSON.stringify(stats).slice(0, 200));
assert.ok(stats.total > 20000, 'real index should have >20k docs');
const hit = backend.search({ q: '知识库', limit: 3 });
assert.equal(hit.ok, true);
assert.ok(hit.count > 0, 'real search should hit');
assert.ok(hit.results[0].snippet.includes('\u0001') || hit.results[0].snippet.length > 0);
const one = backend.get({ id: hit.results[0].id, max: 500 });
assert.equal(one.ok, true);
assert.ok(one.body.length <= 500, 'get must be capped');

// Verify the tool definition shape (render signature is (_args, value)).
const tool = mod.toolDefinition(backend);
assert.equal(tool.name, 'kb');
assert.equal(typeof tool.execute, 'function');
const rendered = tool.output.render({ action: 'search' }, hit);
assert.equal(rendered[0].type, 'text');
assert.ok(rendered[0].text.includes('知识库'));
const statRun = await tool.execute({ action: 'stats' });
assert.equal(statRun.ok, true);

console.log('smoke ok', JSON.stringify({
  trigram: 'chinese-substring-ok',
  filter: 'ext-ok',
  host: 'module-loadable',
  realDocs: stats.total,
  realHits: hit.total,
  apiPrefix: API_PREFIX,
}));
