# -*- coding: utf-8 -*-
"""Read-only query CLI for the local knowledge base (kb.sqlite).

Outputs a single compact JSON line to stdout. No document bodies are printed
unless the `get` command is used (token-efficient for the agent tool path).

Commands:
  stats                      -> index health + breakdowns
  search --q TEXT [--limit N] [--offset N] [--ext a,b] [--category x] [--root C:]
  get    --id N [--max N]    -> one document (with body preview)
  path   --id N              -> just the absolute path (for reveal)
"""
import sys, os, json, sqlite3, time, argparse

DEFAULT_DB = os.path.join(os.path.expanduser('~'), '.dsh', 'local-kb', 'kb.sqlite')


def out(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))


def connect(db, read_only=True):
    if not os.path.exists(db):
        return None
    if read_only:
        con = sqlite3.connect('file:%s?mode=ro' % db.replace('?', '%3f'), uri=True)
    else:
        con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    return con


def cmd_stats(con, args):
    meta = {}
    try:
        for r in con.execute('SELECT key,value FROM meta'):
            try:
                meta[r['key']] = json.loads(r['value'])
            except Exception:
                meta[r['key']] = r['value']
    except sqlite3.Error:
        pass
    total = con.execute('SELECT count(*) FROM docs').fetchone()[0]
    def group(col):
        return {str(r[0]): r[1] for r in con.execute(
            'SELECT %s, count(*) FROM docs GROUP BY %s ORDER BY count(*) DESC' % (col, col))}
    result = {
        'ok': True,
        'db': args.db,
        'db_exists': True,
        'db_size': os.path.getsize(args.db),
        'total': total,
        'by_ext': group('ext'),
        'by_category': group('category'),
        'by_root': group('root'),
        'by_status': group('status'),
        'indexed_chars': con.execute('SELECT coalesce(sum(chars),0) FROM docs').fetchone()[0],
        'meta': meta,
    }
    return result


def fts_phrase(q):
    q = (q or '').strip().strip('"').replace('"', '""')
    return '"' + q + '"' if q else ''


def build_filters(args):
    clauses, params = [], []
    if args.ext:
        exts = [e.strip().lower().lstrip('.') for e in args.ext.split(',') if e.strip()]
        if exts:
            clauses.append('d.ext IN (%s)' % ','.join('?' * len(exts)))
            params.extend(exts)
    if args.category:
        clauses.append('d.category = ?')
        params.append(args.category)
    if args.root:
        clauses.append('d.root = ?')
        params.append(args.root)
    return (' AND ' + ' AND '.join(clauses)) if clauses else '', params


def cmd_search(con, args):
    q = (args.q or '').strip()
    if not q:
        return {'ok': False, 'error': '空查询', 'results': []}
    t0 = time.time()
    extra, extra_params = build_filters(args)
    limit = max(1, min(int(args.limit or 20), 100))
    offset = max(0, int(args.offset or 0))
    results = []
    used = 'fts'
    # trigram tokenizer needs >= 3 chars. Short queries use LIKE on name/head only.
    if len(q) >= 3:
        phrase = fts_phrase(q)
        sql = ("SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,"
               "d.chars,d.status,d.head,"
               "snippet(fts,1,char(1),char(2),'…',36) AS snip,"
               "bm25(fts, 1.0, 1.0) AS score "
               "FROM fts JOIN docs d ON d.id = fts.rowid "
               "WHERE fts MATCH ?" + extra +
               " ORDER BY rank LIMIT ? OFFSET ?")
        try:
            rows = con.execute(sql, [phrase] + extra_params + [limit, offset]).fetchall()
            for r in rows:
                results.append(_row(r, r['snip'], r['score']))
        except sqlite3.Error:
            used = 'like'  # fall through
    if not results:
        used = 'like'
        like = '%' + q.replace('%', '\\%').replace('_', '\\_') + '%'
        sql = ("SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,"
               "d.chars,d.status,d.head, NULL AS snip, 0 AS score "
               "FROM docs d WHERE (d.name LIKE ? ESCAPE '\\' OR d.head LIKE ? ESCAPE '\\')" + extra +
               " ORDER BY d.mtime DESC LIMIT ? OFFSET ?")
        rows = con.execute(sql, [like, like] + extra_params + [limit, offset]).fetchall()
        for r in rows:
            snip = (r['head'] or r['name'])[:160]
            results.append(_row(r, snip, 0))
    return {
        'ok': True, 'query': q, 'mode': used, 'limit': limit, 'offset': offset,
        'count': len(results), 'elapsed_ms': round((time.time() - t0) * 1000, 1),
        'results': results,
    }


def _row(r, snip, score):
    return {
        'id': r['id'], 'name': r['name'], 'path': r['path'], 'ext': r['ext'],
        'size': r['size'], 'mtime': r['mtime'], 'category': r['category'],
        'root': r['root'], 'chars': r['chars'], 'status': r['status'],
        'snippet': snip or (r['head'] or '')[:160], 'score': score,
    }


def cmd_get(con, args):
    r = con.execute('SELECT * FROM docs WHERE id = ?', (args.id,)).fetchone()
    if not r:
        return {'ok': False, 'error': '未找到该文档 id=%s' % args.id}
    d = dict(r)
    body = d.get('body') or ''
    d['body'] = body[:int(args.max or 8000)]
    d['body_truncated'] = len(body) > int(args.max or 8000)
    d['body_chars'] = len(body)
    d['ok'] = True
    return d


def cmd_path(con, args):
    r = con.execute('SELECT path FROM docs WHERE id = ?', (args.id,)).fetchone()
    if not r:
        return {'ok': False, 'error': '未找到该文档 id=%s' % args.id}
    return {'ok': True, 'id': args.id, 'path': r['path']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('command', choices=['stats', 'search', 'get', 'path'])
    ap.add_argument('--db', default=DEFAULT_DB)
    ap.add_argument('--q')
    ap.add_argument('--limit', type=int, default=20)
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--ext')
    ap.add_argument('--category')
    ap.add_argument('--root')
    ap.add_argument('--id', type=int)
    ap.add_argument('--max', type=int, default=8000)
    args = ap.parse_args()

    if not os.path.exists(args.db):
        out({'ok': False, 'error': '索引尚未建立：%s' % args.db,
             'hint': '在插件里点「重建索引」，或运行 tools/build_kb.py'})
        return
    try:
        con = connect(args.db)
        if args.command == 'stats':
            out(cmd_stats(con, args))
        elif args.command == 'search':
            out(cmd_search(con, args))
        elif args.command == 'get':
            out(cmd_get(con, args))
        elif args.command == 'path':
            out(cmd_path(con, args))
        con.close()
    except Exception as e:
        out({'ok': False, 'error': '%s: %s' % (type(e).__name__, e)})


if __name__ == '__main__':
    main()
