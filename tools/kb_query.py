# -*- coding: utf-8 -*-
"""Read-only query CLI for the local knowledge base (kb.sqlite).

Outputs a single compact JSON line to stdout. No document bodies are printed
unless the `get` command is used (token-efficient for the agent tool path).

Commands:
  stats                      -> index health + breakdowns
  search [--q TEXT]          -> full-text search (name + body + path); OMIT --q to BROWSE recent files
  browse                     -> alias: no-keyword timeline of recent files
  get    --id N [--max N]    -> one document (with body preview)
  path   --id N              -> just the absolute path (for reveal)
  candidates                 -> token-efficient AI-review batch (id/path/head only, no bodies)
  label  --items JSON        -> write AI labels (batch). Or --id N --useful X --topic Y [--why S]
  labels                     -> label health (count + by source)
  Filters (search/browse): --ext a,b --category x --root C: --path SUB --days N --sort mtime|name
                          --useful high|possible|low --topic study|... --label-src ai|rule
  Labels live in a SEPARATE labels.sqlite keyed by path (survives rebuilds); the CLI
  ATTACHes it read-only and merges via a temp view vdoc (rule baseline + AI overrides).
"""
import sys, os, json, sqlite3, time, argparse

DEFAULT_DB = os.path.join(os.path.expanduser('~'), '.dsh', 'local-kb', 'kb.sqlite')
LABELS_DB = os.path.join(os.path.expanduser('~'), '.dsh', 'local-kb', 'labels.sqlite')
USEFUL = ('high', 'possible', 'low')
TOPICS = ('study', 'work', 'code', 'life', 'reference', 'other')


def ensure_labels_db():
    con = sqlite3.connect(LABELS_DB)
    con.execute("CREATE TABLE IF NOT EXISTS labels(path TEXT PRIMARY KEY, useful TEXT,"
                " topic TEXT, why TEXT, src TEXT DEFAULT 'ai', ts INTEGER)")
    con.execute("CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT)")
    con.commit()
    con.close()


def out(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))


def connect(db, read_only=True, with_labels=True):
    if not os.path.exists(db):
        return None
    if read_only:
        con = sqlite3.connect('file:%s?mode=ro' % db.replace('?', '%3f'), uri=True)
    else:
        con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    if with_labels:
        try:
            ensure_labels_db()
            con.execute('ATTACH DATABASE ? AS lb', (LABELS_DB,))
            cols = [r[1] for r in con.execute('PRAGMA table_info(docs)')]
            has = 'rule_useful' in cols and 'rule_topic' in cols
            u = "coalesce(l.useful, d.rule_useful, 'possible')" if has else "coalesce(l.useful, 'possible')"
            tp = "coalesce(l.topic, d.rule_topic, 'other')" if has else "coalesce(l.topic, 'other')"
            con.execute('CREATE TEMP VIEW vdoc AS SELECT d.*, '
                + u + ' AS useful, ' + tp + ' AS topic, '
                "coalesce(l.why,'') AS label_why, "
                "case when l.path is null then 'rule' else 'ai' end AS label_src, "
                "coalesce(l.ts,0) AS label_ts "
                'FROM docs d LEFT JOIN lb.labels l ON l.path = d.path')
        except sqlite3.Error:
            # Older index / no labels -> fall back to plain view with defaults.
            try:
                con.execute('CREATE TEMP VIEW vdoc AS SELECT d.*, '
                    "'possible' AS useful, 'other' AS topic, '' AS label_why, "
                    "'rule' AS label_src, 0 AS label_ts FROM docs d")
            except sqlite3.Error:
                pass
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
    def group_v(col):
        try:
            return {str(r[0]): r[1] for r in con.execute(
                'SELECT %s, count(*) FROM vdoc GROUP BY %s ORDER BY count(*) DESC' % (col, col))}
        except sqlite3.Error:
            return {}
    try:
        ai_count = con.execute('SELECT count(*) FROM lb.labels').fetchone()[0]
    except sqlite3.Error:
        ai_count = 0
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
        'by_useful': group_v('useful'),
        'by_topic': group_v('topic'),
        'by_label_src': group_v('label_src'),
        'ai_labels': ai_count,
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
    if args.path:
        clauses.append('instr(lower(d.path), lower(?)) > 0')
        params.append(args.path)
    if args.days:
        import time as _t
        clauses.append('d.mtime >= ?')
        params.append(_t.time() - float(args.days) * 86400)
    if getattr(args, 'useful', None):
        vals = [v.strip() for v in args.useful.split(',') if v.strip() in USEFUL]
        if vals:
            clauses.append('d.useful IN (%s)' % ','.join('?' * len(vals)))
            params.extend(vals)
    if getattr(args, 'topic', None):
        vals = [v.strip() for v in args.topic.split(',') if v.strip() in TOPICS]
        if vals:
            clauses.append('d.topic IN (%s)' % ','.join('?' * len(vals)))
            params.extend(vals)
    if getattr(args, 'label_src', None) == 'ai':
        clauses.append("d.label_src = 'ai'")
    elif getattr(args, 'label_src', None) == 'rule':
        clauses.append("d.label_src = 'rule'")
    return (' AND ' + ' AND '.join(clauses)) if clauses else '', params


def cmd_search(con, args):
    q = (args.q or '').strip()
    t0 = time.time()
    extra, extra_params = build_filters(args)
    limit = max(1, min(int(args.limit or 20), 100))
    offset = max(0, int(args.offset or 0))
    # LIKE escape uses '!' (backslash is painful across shells/JSON).
    def like_esc(s):
        return '%' + s.replace('!', '!!').replace('%', '!%').replace('_', '!_') + '%'
    order = {'mtime': 'd.mtime DESC', 'name': 'd.name COLLATE NOCASE'}.get(
        args.sort, 'd.mtime DESC')

    # BROWSE: no keyword -> recent-files timeline (省 token: head snippets only).
    if not q:
        sql = ("SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,"
               "d.chars,d.status,d.head, NULL AS snip, 0 AS score "
               "FROM vdoc d WHERE 1=1" + extra +
               " ORDER BY " + order + " LIMIT ? OFFSET ?")
        rows = con.execute(sql, extra_params + [limit, offset]).fetchall()
        results = [_row(r, (r['head'] or r['name'])[:160], 0) for r in rows]
        try:
            total = con.execute('SELECT count(*) FROM vdoc d WHERE 1=1' + extra,
                                extra_params).fetchone()[0]
        except sqlite3.Error:
            total = len(results) + offset
        return {'ok': True, 'query': '', 'mode': 'browse', 'limit': limit,
                'offset': offset, 'total': total, 'count': len(results),
                'elapsed_ms': round((time.time() - t0) * 1000, 1), 'results': results}

    # SEARCH: FTS5 covers name + body + path.
    results = []
    used = 'fts'
    if len(q) >= 3:
        phrase = fts_phrase(q)
        sql = ("SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,"
               "d.chars,d.status,d.head,"
               "snippet(fts,1,char(1),char(2),'…',36) AS snip,"
               "bm25(fts, 1.0, 1.0) AS score "
               "FROM fts JOIN vdoc d ON d.id = fts.rowid "
               "WHERE fts MATCH ?" + extra +
               " ORDER BY rank LIMIT ? OFFSET ?")
        try:
            rows = con.execute(sql, [phrase] + extra_params + [limit, offset]).fetchall()
            for r in rows:
                results.append(_row(r, r['snip'], r['score']))
        except sqlite3.Error:
            used = 'like'
    if not results:
        used = 'like'
        like = like_esc(q)
        sql = ("SELECT d.id,d.name,d.path,d.ext,d.size,d.mtime,d.category,d.root,"
               "d.chars,d.status,d.head, NULL AS snip, 0 AS score "
               "FROM vdoc d WHERE (d.name LIKE ? ESCAPE '!' OR d.head LIKE ? ESCAPE '!')" + extra +
               " ORDER BY " + order + " LIMIT ? OFFSET ?")
        rows = con.execute(sql, [like, like] + extra_params + [limit, offset]).fetchall()
        for r in rows:
            results.append(_row(r, (r['head'] or r['name'])[:160], 0))
    try:
        if used == 'fts':
            total = con.execute(
                'SELECT count(*) FROM fts JOIN vdoc d ON d.id = fts.rowid WHERE fts MATCH ?' + extra,
                [fts_phrase(q)] + extra_params).fetchone()[0]
        else:
            like = like_esc(q)
            total = con.execute(
                "SELECT count(*) FROM vdoc d WHERE (d.name LIKE ? ESCAPE '!' OR d.head LIKE ? ESCAPE '!')" + extra,
                [like, like] + extra_params).fetchone()[0]
    except sqlite3.Error:
        total = len(results) + offset
    return {
        'ok': True, 'query': q, 'mode': used, 'limit': limit, 'offset': offset,
        'total': total, 'count': len(results),
        'elapsed_ms': round((time.time() - t0) * 1000, 1), 'results': results,
    }


def _row(r, snip, score):
    return {
        'id': r['id'], 'name': r['name'], 'path': r['path'], 'ext': r['ext'],
        'size': r['size'], 'mtime': r['mtime'], 'category': r['category'],
        'root': r['root'], 'chars': r['chars'], 'status': r['status'],
        'snippet': snip or (r['head'] or '')[:160], 'score': score,
        'useful': r['useful'] if 'useful' in r.keys() else 'possible',
        'topic': r['topic'] if 'topic' in r.keys() else 'other',
        'label_src': r['label_src'] if 'label_src' in r.keys() else 'rule',
    }


def read_state():
    """Flags kept beside the labels (first_pass_done / last_rebuild_ts)."""
    out = {}
    try:
        ensure_labels_db()
        con = sqlite3.connect(LABELS_DB)
        try:
            for k, v in con.execute('SELECT key, value FROM state'):
                out[k] = v
        except sqlite3.Error:
            pass
        con.close()
    except sqlite3.Error:
        pass
    return out


def write_state(patch):
    try:
        ensure_labels_db()
        con = sqlite3.connect(LABELS_DB)
        con.executemany(
            'INSERT INTO state(key,value) VALUES(?,?) '
            'ON CONFLICT(key) DO UPDATE SET value=excluded.value',
            [(str(k), str(v)) for k, v in patch.items()])
        con.commit()
        con.close()
        return True
    except sqlite3.Error:
        return False


def resolve_mode(args):
    """full = thorough first pass (tokens are fine); incremental = cheap.

    Explicit --mode wins; otherwise the recorded first-pass flag decides, so
    the very first run over a fresh index is thorough and every later run
    (after a rebuild) only looks at files that still carry no AI label.
    """
    want = (getattr(args, 'mode', None) or 'auto').lower()
    if want in ('full', 'incremental'):
        return want
    return 'incremental' if read_state().get('first_pass_done') == '1' else 'full'


def cmd_candidates(con, args):
    t0 = time.time()
    mode = resolve_mode(args)
    full = mode == 'full'
    extra, params = build_filters(args)
    limit = max(1, min(int(args.limit or (50 if full else 30)), 200 if full else 100))
    offset = max(0, int(args.offset or 0))
    min_chars = max(0, int(getattr(args, 'min_chars', None) if getattr(args, 'min_chars', None) is not None
                          else (0 if full else 200)))
    include_ai = getattr(args, 'include_ai', None)
    if include_ai is None:
        include_ai = full
    head_chars = 400 if full else 200
    q = (getattr(args, 'q2', None) or getattr(args, 'q', None) or '').strip()

    def build(counting):
        cond = ' WHERE 1=1' + extra
        args_p = list(params)
        if not include_ai:
            cond += " AND d.label_src = 'rule'"
        if not full and not getattr(args, 'useful', None):
            cond += " AND d.useful = 'possible'"
        cond += ' AND d.chars >= ?'
        args_p.append(min_chars)
        if q:
            cond += ' AND (instr(lower(d.path), lower(?)) > 0 OR instr(lower(d.name), lower(?)) > 0)'
            args_p += [q, q]
        if counting:
            return 'SELECT count(*) FROM vdoc d' + cond, args_p
        cols = ('d.id,d.name,d.path,d.ext,d.chars,d.mtime,d.useful,d.topic,d.label_src,'
                + ('substr(d.body,1,400) AS head' if full else 'd.head'))
        order = (' ORDER BY CASE d.useful WHEN \'high\' THEN 0 WHEN \'possible\' THEN 1 ELSE 2 END,'
                 ' d.chars DESC, d.mtime DESC' if full
                 else ' ORDER BY d.mtime DESC, d.chars DESC')
        return ('SELECT ' + cols + ' FROM vdoc d' + cond + order + ' LIMIT ? OFFSET ?',
                args_p + [limit, offset])

    sql, sparams = build(False)
    rows = con.execute(sql, sparams).fetchall()
    csql, cparams = build(True)
    try:
        total = con.execute(csql, cparams).fetchone()[0]
    except sqlite3.Error:
        total = len(rows) + offset
    return {'ok': True, 'mode': mode, 'first_pass_done': read_state().get('first_pass_done') == '1',
            'limit': limit, 'offset': offset, 'total': total,
            'count': len(rows), 'elapsed_ms': round((time.time() - t0) * 1000, 1),
            'results': [{'id': r['id'], 'name': r['name'], 'path': r['path'],
                         'ext': r['ext'], 'chars': r['chars'], 'mtime': r['mtime'],
                         'useful': r['useful'], 'topic': r['topic'],
                         'label_src': r['label_src'], 'head': (r['head'] or '')[:head_chars]}
                        for r in rows]}


def cmd_label_status(con, args):
    st = read_state()
    mode = 'full' if st.get('first_pass_done') != '1' else 'incremental'
    try:
        pending = con.execute("SELECT count(*) FROM vdoc d WHERE d.label_src='rule' AND d.chars>=200").fetchone()[0]
    except sqlite3.Error:
        pending = 0
    try:
        pending_new = con.execute(
            "SELECT count(*) FROM vdoc d WHERE d.label_src='rule' AND d.chars>=200 AND d.mtime>=?",
            [float(st.get('last_rebuild_ts') or 0)]).fetchone()[0]
    except sqlite3.Error:
        pending_new = 0
    try:
        ai_labeled = con.execute('SELECT count(*) FROM lb.labels').fetchone()[0]
    except sqlite3.Error:
        ai_labeled = 0
    return {'ok': True, 'mode': mode,
            'first_pass_done': st.get('first_pass_done') == '1',
            'first_pass_at': int(st.get('first_pass_at') or 0),
            'last_rebuild_ts': float(st.get('last_rebuild_ts') or 0),
            'ai_labeled': ai_labeled, 'pending': pending, 'pending_new': pending_new,
            'labels_path': LABELS_DB}


def cmd_mark_first_pass(con, args):
    reset = bool(getattr(args, 'reset', False))
    at = int(time.time() * 1000)
    write_state({'first_pass_done': '0' if reset else '1',
                 'first_pass_at': '0' if reset else str(at)})
    return {'ok': True, 'first_pass_done': (not reset), 'first_pass_at': 0 if reset else at}


def cmd_label(con, args):
    items = []
    if getattr(args, 'items', None):
        try:
            items = json.loads(args.items)
            if isinstance(items, dict):
                items = [items]
        except Exception as e:
            return {'ok': False, 'error': '--items 不是合法 JSON: %s' % e}
    elif args.id is not None:
        items = [{'id': args.id, 'useful': args.useful, 'topic': args.topic, 'why': args.why}]
    if not items:
        return {'ok': False, 'error': '缺少 --items 或 --id'}
    # Resolve id -> path from the index (labels are keyed by path).
    con2 = connect(args.db, read_only=True, with_labels=False)
    ids = [int(it['id']) for it in items if it.get('id') is not None and not it.get('path')]
    paths = {}
    if ids and con2:
        for row in con2.execute('SELECT id,path FROM docs WHERE id IN (%s)' % ','.join('?' * len(ids)), ids):
            paths[row['id']] = row['path']
    if con2:
        con2.close()
    rows = []
    for it in items:
        pth = it.get('path') or paths.get(it.get('id'))
        if not pth:
            continue
        u = it.get('useful') if it.get('useful') in USEFUL else None
        tp = it.get('topic') if it.get('topic') in TOPICS else None
        if not u and not tp:
            continue
        rows.append((str(pth), u, tp, str(it.get('why') or '')[:300], str(it.get('src') or 'ai')))
    if not rows:
        return {'ok': False, 'error': '没有可写入的有效标注'}
    ensure_labels_db()
    lw = sqlite3.connect(LABELS_DB)
    now = int(time.time() * 1000)
    for r in rows:
        lw.execute('INSERT INTO labels(path,useful,topic,why,src,ts) VALUES(?,?,?,?,?,?) '
                   'ON CONFLICT(path) DO UPDATE SET useful=coalesce(excluded.useful,labels.useful), '
                   'topic=coalesce(excluded.topic,labels.topic), why=excluded.why, '
                   'src=excluded.src, ts=excluded.ts', r + (now,))
    lw.commit()
    lw.close()
    return {'ok': True, 'written': len(rows), 'labels_db': LABELS_DB}


def cmd_labels(con, args):
    try:
        n = con.execute('SELECT count(*) FROM lb.labels').fetchone()[0]
        by = {str(r[0]): r[1] for r in con.execute('SELECT src, count(*) FROM lb.labels GROUP BY src')}
    except sqlite3.Error:
        n, by = 0, {}
    return {'ok': True, 'ai_labels': n, 'by_src': by, 'labels_db': LABELS_DB}


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
    ap.add_argument('command', choices=['stats', 'search', 'browse', 'get', 'path',
                                        'candidates', 'label', 'labels', 'label-status',
                                        'mark-first-pass'])
    ap.add_argument('--db', default=DEFAULT_DB)
    ap.add_argument('--q')
    ap.add_argument('--limit', type=int, default=20)
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--ext')
    ap.add_argument('--category')
    ap.add_argument('--root')
    ap.add_argument('--id', type=int)
    ap.add_argument('--max', type=int, default=8000)
    ap.add_argument('--path')
    ap.add_argument('--days', type=float)
    ap.add_argument('--sort', choices=['relevance', 'mtime', 'name'], default='relevance')
    ap.add_argument('--useful')
    ap.add_argument('--topic')
    ap.add_argument('--label-src', dest='label_src')
    ap.add_argument('--items')
    ap.add_argument('--why')
    ap.add_argument('--q2')
    ap.add_argument('--min-chars', dest='min_chars', type=int, default=None)
    ap.add_argument('--mode', choices=['auto', 'full', 'incremental'], default='auto',
                    help='candidates: full = thorough first pass (tokens OK), '
                         'incremental = only docs with no AI label yet (省 token)')
    ap.add_argument('--include-ai', dest='include_ai', action='store_true', default=None)
    ap.add_argument('--reset', action='store_true',
                    help='label-status: clear the first-pass flag so the next run is thorough again')
    args = ap.parse_args()

    if not os.path.exists(args.db):
        out({'ok': False, 'error': '索引尚未建立：%s' % args.db,
             'hint': '在插件里点「重建索引」，或运行 tools/build_kb.py'})
        return
    try:
        con = connect(args.db)
        if args.command == 'stats':
            out(cmd_stats(con, args))
        elif args.command in ('search', 'browse'):
            if args.command == 'browse':
                args.q = ''
            out(cmd_search(con, args))
        elif args.command == 'get':
            out(cmd_get(con, args))
        elif args.command == 'path':
            out(cmd_path(con, args))
        elif args.command == 'candidates':
            out(cmd_candidates(con, args))
        elif args.command == 'label':
            out(cmd_label(con, args))
        elif args.command == 'labels':
            out(cmd_labels(con, args))
        elif args.command == 'label-status':
            out(cmd_label_status(con, args))
        elif args.command == 'mark-first-pass':
            out(cmd_mark_first_pass(con, args))
        con.close()
    except Exception as e:
        out({'ok': False, 'error': '%s: %s' % (type(e).__name__, e)})


if __name__ == '__main__':
    main()
