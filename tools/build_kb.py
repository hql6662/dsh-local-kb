# -*- coding: utf-8 -*-
"""Full-disk local knowledge base builder.

Scans C:\\ and E:\\ for documents, extracts plain text, and writes a
SQLite FTS5 (trigram) index at ~/.dsh/local-kb/kb.sqlite.
Text is written to the DB only; nothing is printed to the model context
beyond a compact JSON summary line. 省 token.

Run: python tools/build_kb.py [--roots C:/,E:/] [--db path] [--max-chars 200000]
"""
import sys, os, io, re, json, time, sqlite3, zipfile, argparse, html, traceback

# The bundled DSH Python has python-pptx / openpyxl; system Python has PyMuPDF.
# Append its site-packages so one interpreter does everything.
BUNDLED_SP = r"C:\Users\hql\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages"
if os.path.isdir(BUNDLED_SP):
    sys.path.append(BUNDLED_SP)
# tools/ is on sys.path when run as a script; add it explicitly for imports too.
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)
import extra_extract  # noqa: E402  (ebook + Office extractors, vendored libs)

EXTS = {
    '.md', '.markdown', '.txt', '.rst', '.html', '.htm', '.json', '.yaml', '.yml',
    '.csv', '.tsv', '.log', '.epub', '.pdf', '.docx', '.doc', '.pptx', '.ppt',
    '.xlsx', '.xls',
}
# Add ebook + Office variants handled by extra_extract: .mobi/.azw*, .chm,
# .rtf, .tex, .fb2, ODF, and OOXML template/macro variants. Note the disk also
# contains .pdb/.key/.pot/.dot which are NOT documents (debug symbols, gettext
# templates, encryption keys, graphviz) and are deliberately excluded.
EXTS = EXTS | extra_extract.EXTS
# Extraction is dispatched by EXTRACTORS (original formats) plus the
# extra_extract dispatcher (everything in extra_extract.EXTS). Anything not in
# either set falls back to a name-only stub, so no raw body ever leaks.
EXTRACTABLE = EXTS
# Directories that are pure machine caches / code deps. Value documents are kept.
# Only machine internals that cannot contain user documents are skipped.
# AppData / .workbuddy / .pi / .vscode / .dsh / caches ARE scanned, because the
# user asked for the whole disk including caches (no curated personal-only set).
SKIP_DIRS = {
    'node_modules', '.git', '.svn', '__pycache__', '.venv', 'venv', 'env',
    'site-packages', '.gradle', '.m2', '.npm', '.pnpm-store',
    'Windows', 'Program Files', 'Program Files (x86)', 'ProgramData',
    '$Recycle.Bin', 'System Volume Information',
    'GPUCache', 'ShaderCache', 'DawnCache', 'Crashpad', 'Code Cache',
    'dist', 'build', 'target', '.next', '.nuxt', '.turbo',
    '.parcel-cache', '.sass-cache', 'bower_components',
}
# But do NOT skip these even if a parent has a skippable name.
ALLOW_DIRS = {'Desktop', 'Documents', 'MyFiles', 'OneDrive', 'WPS Cloud',
              'StudyMate', 'Qianwen', 'WorkBuddy', 'dsh files', 'ws',
              'pi history', 'Users'}
# Transient scratch dirs produced by the extractor's own probes (COM / CHM /
# MOBI debugging). They are not user documents and pollute "recent files".
SKIP_DIR_PREFIXES = ('kbdbg_', 'kbenv_', 'kbdiag_', 'kbsmall', 'kbprobe',
                     'kbvenv', 'kbword', 'kb_fts_', 'mobiext',
                     'kbcnt_', 'kboffice_', 'kbchm_', 'kbloop_', 'kbparse',
                     'kbscope', 'kbtest', 'dsh-subprocess-')
CODE_EXTS = {'.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.py', '.java',
             '.go', '.rs', '.c', '.h', '.cpp', '.hpp', '.cs', '.rb', '.php',
             '.sh', '.bat', '.ps1', '.sql', '.css', '.scss', '.less', '.xml',
             '.toml', '.ini', '.cfg', '.conf', '.lock', '.map', '.min.js'}

def clean_text(s, max_chars):
    s = re.sub(r'\s+', ' ', s or '').strip()
    return s[:max_chars]

def decode_bytes(b):
    # files are read with a byte cap, so a multi-byte char is often cut at the
    # end. Decode with replacement instead of falling through to latin-1 (which
    # would turn valid UTF-8 Chinese into mojibake).
    return b.decode('utf-8', errors='replace')

def read_small(path, limit):
    with open(path, 'rb') as f:
        return decode_bytes(f.read(limit))

# ---------------- extractors ----------------
def extract_plain(path, max_chars):
    return clean_text(read_small(path, max_chars * 2), max_chars)

def extract_html(path, max_chars):
    raw = read_small(path, max_chars * 3)
    raw = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw)
    raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
    return clean_text(html.unescape(raw), max_chars)

def extract_pdf(path, max_chars):
    import pymupdf
    doc = pymupdf.open(path)
    out = []
    total = 0
    for page in doc:
        t = page.get_text('text')
        if not t:
            continue
        out.append(t)
        total += len(t)
        if total >= max_chars:
            break
    pages = len(doc)
    doc.close()
    return clean_text('\n'.join(out), max_chars), pages

def extract_docx(path, max_chars):
    import docx
    d = docx.Document(path)
    parts = [p.text for p in d.paragraphs if p.text]
    for table in d.tables:
        for row in table.rows:
            parts.append(' | '.join(c.text for c in row.cells))
    return clean_text('\n'.join(parts), max_chars)

def extract_pptx(path, max_chars):
    from pptx import Presentation
    pr = Presentation(path)
    parts = []
    for i, slide in enumerate(pr.slides, 1):
        parts.append('[幻灯片 %d]' % i)
        for shape in slide.shapes:
            if shape.has_text_frame and shape.text_frame.text:
                parts.append(shape.text_frame.text)
            if getattr(shape, 'has_table', False):
                for row in shape.table.rows:
                    parts.append(' | '.join(c.text for c in row.cells))
    return clean_text('\n'.join(parts), max_chars)

def extract_xlsx(path, max_chars):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    parts = []
    for ws in wb.worksheets:
        parts.append('[工作表 %s]' % ws.title)
        for row in ws.iter_rows(values_only=True):
            cells = [str(c) for c in row if c is not None]
            if cells:
                parts.append(' | '.join(cells))
    wb.close()
    return clean_text('\n'.join(parts), max_chars)

def extract_epub(path, max_chars):
    out = []
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if n.lower().endswith(('.xhtml', '.html', '.htm', '.txt'))]
        names.sort()
        for n in names[:120]:
            raw = decode_bytes(z.read(n))
            raw = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', raw)
            raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
            out.append(html.unescape(raw))
    return clean_text('\n'.join(out), max_chars)

EXTRACTORS = {
    '.pdf': extract_pdf, '.docx': extract_docx, '.pptx': extract_pptx,
    '.xlsx': extract_xlsx, '.epub': extract_epub,
    '.html': extract_html, '.htm': extract_html,
}
for e in ('.md', '.markdown', '.txt', '.rst', '.json', '.yaml', '.yml',
          '.csv', '.tsv', '.log'):
    EXTRACTORS[e] = extract_plain

def classify(path, root, ext):
    low = path.lower()
    if any(k in low for k in ('/desktop/', '/documents/', '/myfiles/',
                              '/onedrive/', '/wps cloud/', '/studymate/',
                              '/qianwen/', '/workbuddy/', '/books/',
                              '/notes/', '/note/', '/读书/', '/笔记/',
                              '/文档/', '/资料/', '/作品/', '/文章/')):
        return 'personal'
    if any(k in low for k in ('/node_modules/', '/.dsh/', '/appdata/',
                              '/.workbuddy/', '/.pi/', '/.vscode/',
                              '/site-packages/', '/cache/', '/caches/',
                              '/temp/', '/tmp/', '/log/', '/logs/')):
        return 'dev'
    if ext in CODE_EXTS or ext in ('.json', '.yaml', '.yml', '.lock'):
        return 'dev'
    return 'personal'

# ------------------------------------------------------------------ labels
# Zero-cost rule-based "is it useful / what topic" tagging. This is the
# baseline that works immediately, with NO model tokens. AI can later override
# any of these per-path via labels.sqlite (see host/kb.js).
USEFUL = ('high', 'possible', 'low')
TOPICS = ('study', 'work', 'code', 'life', 'reference', 'other')

def classify_labels(path, name, ext, category, size, status, chars, head):
    low = path.lower()
    nm = name.lower()
    # ---- topic: from directory / filename keywords -------------------------
    topic = 'other'
    if any(k in low for k in ('/study', '/textbook', '/course', '/学习/', '/教材/',
                              '/课程/', '/论文/', '/实验报告/', '/读书/', '/笔记/',
                              '/study', '/homework', '/作业/', '/考试/', '/考研/')):
        topic = 'study'
    elif any(k in low for k in ('/codeproject', '/src/', '/repo', '/github',
                                '/node_modules/', '/.git/', '/workspace/', '/ws/',
                                '/code/', '/项目源码', '/dev/')) or ext in (
                                    '.js', '.ts', '.py', '.java', '.go', '.c',
                                    '.cpp', '.h', '.cs', '.sh', '.ps1', '.sql'):
        topic = 'code'
    elif any(k in low for k in ('/01-work', '/work/', '/办公/', '/工作/',
                                '/报告/', '/会议/', '/合同/', '/客户/', '/简历/',
                                '/project/', '/实习/')):
        topic = 'work'
    elif any(k in low for k in ('/manual', '/reference', '/guide', '/api/',
                                '/手册', '/帮助', '/docs/', '/documentation',
                                '/说明', '/spec/')) or ext in ('.chm',):
        topic = 'reference'
    elif any(k in low for k in ('/生活/', '/照片/', '/账单/', '/医疗/', '/旅行/',
                                '/photo/', '/bill/', '/health/')):
        topic = 'life'
    if topic == 'other' and any(k in nm for k in ('论文', '实验', '笔记', '读书',
                                                  '教材', '课件', '作业', '复习')):
        topic = 'study'
    if topic == 'other' and any(k in nm for k in ('手册', '指南', '说明', 'api',
                                                  'reference', 'spec')):
        topic = 'reference'
    if topic == 'other' and any(k in nm for k in ('报告', '总结', '计划', '合同',
                                                  '会议', '简历')):
        topic = 'work'
    # ---- useful: junk caches / logs / empty stubs are low -------------------
    useful = 'possible'
    junk = any(k in low for k in ('/appdata/', '/cache/', '/caches/', '/temp/',
                                  '/tmp/', '/node_modules/', '/.git/',
                                  '/gpuCache/', '/shadercache/', '/crashpad/',
                                  '/code cache/', '/logs/', '/log/'))
    if status in ('failed', 'skipped', 'name-only') or chars < 40:
        useful = 'low'
    elif ext in ('.log', '.lock', '.map') or (junk and ext in ('.json', '.yaml', '.yml', '.log', '.txt')):
        useful = 'low'
    elif junk and size < 4096:
        useful = 'low'
    elif category == 'personal' and chars >= 300 and ext in (
            '.md', '.markdown', '.txt', '.pdf', '.docx', '.doc', '.pptx', '.ppt',
            '.xlsx', '.epub', '.mobi', '.chm', '.rtf', '.html', '.htm'):
        useful = 'high'
    elif chars >= 1500 and ext in ('.pdf', '.epub', '.mobi', '.chm', '.docx', '.pptx'):
        useful = 'high'
    elif topic in ('study', 'work', 'reference') and chars >= 300:
        useful = 'high'
    return useful, topic


def is_probably_dev_junk(name, ext, size):
    # Skip tiny config/lock files in dev caches; keep personal docs regardless.
    if ext in ('.json', '.yaml', '.yml', '.log', '.lock', '.map') and size < 512:
        return True
    if name.startswith('package-lock') or name.endswith('.min.js'):
        return True
    return False

def wal_scan(roots, max_bytes):
    seen = set()
    results = []
    def walk(base, depth):
        if depth > 18:
            return
        try:
            entries = list(os.scandir(base))
        except Exception:
            return
        for ent in entries:
            try:
                if ent.is_symlink() if hasattr(ent, 'is_symlink') else False:
                    continue
                name = ent.name
                full = ent.path
                if ent.is_dir(follow_symlinks=False):
                    if name in SKIP_DIRS and name not in ALLOW_DIRS:
                        continue
                    if name.lower().startswith(SKIP_DIR_PREFIXES):
                        continue
                    walk(full, depth + 1)
                    continue
                if not ent.is_file(follow_symlinks=False):
                    continue
                ext = os.path.splitext(name)[1].lower()
                if ext not in EXTS:
                    continue
                if is_probably_dev_junk(name, ext, ent.stat().st_size):
                    continue
                st = ent.stat()
                key = (full.lower(), st.st_size, int(st.st_mtime))
                if key in seen:
                    continue
                seen.add(key)
                results.append({
                    'path': full, 'name': name, 'ext': ext.lstrip('.'),
                    'size': st.st_size, 'mtime': st.st_mtime,
                    'root': full[:2].upper() + ':',
                })
            except Exception:
                continue
    for r in roots:
        walk(r, 0)
    return results

DDL = """
CREATE TABLE IF NOT EXISTS docs(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  ext TEXT,
  size INTEGER,
  mtime REAL,
  category TEXT,
  root TEXT,
  chars INTEGER,
  status TEXT,
  note TEXT,
  head TEXT,
  body TEXT,
  rule_useful TEXT,
  rule_topic TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
  name, body, path, content='docs', content_rowid='id', tokenize='trigram'
);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--roots', default='C:/,E:/')
    ap.add_argument('--db', default=os.path.join(os.path.expanduser('~'), '.dsh', 'local-kb', 'kb.sqlite'))
    ap.add_argument('--max-chars', type=int, default=30000)
    ap.add_argument('--max-bytes', type=int, default=40 * 1024 * 1024,
                    help='skip files larger than this (40MB default)')
    ap.add_argument('--report', default=os.path.join(os.path.dirname(__file__), 'build_report.json'))
    args = ap.parse_args()

    os.makedirs(os.path.dirname(args.db), exist_ok=True)
    for suffix in ('', '-wal', '-shm'):
        try:
            os.unlink(args.db + suffix)
        except OSError:
            pass

    t0 = time.time()
    files = wal_scan([r.strip() for r in args.roots.split(',') if r.strip()], args.max_bytes)
    scan_s = time.time() - t0

    con = sqlite3.connect(args.db)
    con.executescript(DDL)
    ins = con.execute  # noqa
    insert_sql = ('INSERT OR IGNORE INTO docs'
                  '(name,path,ext,size,mtime,category,root,chars,status,note,head,body,rule_useful,rule_topic)'
                  ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    stats = {'scanned': len(files), 'ok': 0, 'empty': 0, 'failed': 0,
             'skipped_large': 0, 'name_only': 0,
             'by_ext': {}, 'by_root': {}, 'by_category': {},
             'by_useful': {}, 'by_topic': {}}
    t1 = time.time()
    # Legacy binary Office (.doc/.ppt/.xls) is extracted with ONE Office COM
    # instance per application, up front, in a single PowerShell process.
    # Results are cached by path for the main loop below. 省 time + 省 token.
    office_text = {}
    try:
        office_text = extra_extract.batch_office(files, args.max_chars)
    except Exception as e:
        print('office batch unavailable: %s' % e, file=sys.stderr)
    for i, f in enumerate(files):
        ext = '.' + f['ext']
        body, status, note = '', 'ok', ''
        cat = classify(f['path'], f['root'], ext)
        f['category'] = cat
        try:
            if f['size'] > args.max_bytes:
                status, note = 'skipped', 'too-large'
            elif ext in EXTRACTORS:
                res = EXTRACTORS[ext](f['path'], args.max_chars)
                if isinstance(res, tuple):
                    body, pages = res
                    note = 'pages:%d' % pages
                else:
                    body = res
                if not body:
                    status = 'empty'
            elif ext in extra_extract.EXTS:
                body = extra_extract.extract(f['path'], ext, args.max_chars,
                                            office_text=office_text)
                if body is None:
                    body = ''
                    status, note = 'name-only', 'extractor-unavailable'
                elif not body:
                    status = 'empty'
            else:
                status = 'name-only'
        except Exception as e:
            status, note = 'failed', ('%s: %s' % (type(e).__name__, e))[:300]
        if body is None:
            body = ''
        head = body[:200] if body else ''
        useful, topic = classify_labels(f['path'], f['name'], ext,
                                        cat, f['size'], status, len(body), head)
        params = (f['name'], f['path'], f['ext'], f['size'], f['mtime'],
                  cat, f['root'], len(body), status, note, head, body,
                  useful, topic)
        con.execute(insert_sql, params)
        bucket = {'ok': 'ok', 'empty': 'empty', 'failed': 'failed',
                  'skipped': 'skipped_large', 'name-only': 'name_only'}[status]
        stats[bucket] = stats.get(bucket, 0) + 1
        stats['by_ext'][f['ext']] = stats['by_ext'].get(f['ext'], 0) + 1
        stats['by_root'][f['root']] = stats['by_root'].get(f['root'], 0) + 1
        stats['by_category'][cat] = stats['by_category'].get(cat, 0) + 1
        stats['by_useful'][useful] = stats['by_useful'].get(useful, 0) + 1
        stats['by_topic'][topic] = stats['by_topic'].get(topic, 0) + 1
        if (i + 1) % 500 == 0:
            con.commit()
    con.commit()

    t2 = time.time()
    con.execute("INSERT INTO fts(fts) VALUES('rebuild')")
    con.commit()
    t3 = time.time()

    meta = {
        'version': 3, 'built_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'roots': args.roots, 'scan_seconds': round(scan_s, 1),
        'extract_seconds': round(t2 - t1, 1), 'fts_seconds': round(t3 - t2, 1),
        'total_seconds': round(time.time() - t0, 1),
        'max_chars': args.max_chars, 'max_bytes': args.max_bytes,
        'docs': stats['scanned'],
    }
    for k, v in meta.items():
        con.execute('INSERT OR REPLACE INTO meta(key,value) VALUES (?,?)',
                    (k, json.dumps(v, ensure_ascii=False)))
    con.commit()
    total = con.execute('SELECT count(*) FROM docs').fetchone()[0]
    con.close()

    report = {'db': args.db, 'meta': meta, 'stats': stats, 'total_rows': total}
    with io.open(args.report, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    print(json.dumps({'ok': True, 'docs': total, 'meta': meta,
                      'by_ext': stats['by_ext'], 'by_category': stats['by_category']},
                     ensure_ascii=False))

if __name__ == '__main__':
    main()
