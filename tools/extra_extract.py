# -*- coding: utf-8 -*-
"""Extra text extractors: ebooks + Office formats for the local KB builder.

Design goals
------------
* Every byte of document text stays on disk / in SQLite. Only a compact summary
  is ever printed. 省 token.
* Pure-Python ebook support is vendored in ``./vendor`` so the builder has no
  network or pip dependency at rebuild time.
* Legacy binary Office (.doc/.ppt/.xls) is extracted with **ONE** Office COM
  instance per application, driven by a single PowerShell process. Launching
  Word 59 times would take minutes; one instance takes seconds. Results are
  written incrementally, so a timeout still keeps everything already extracted.
* Everything here is best-effort: if Office / hh.exe / mobi is missing, the
  caller gets ``None`` and the builder falls back to a name-only stub.

Run ``python extra_extract.py --selftest`` to validate against real files.
"""
import os
import sys
import io
import re
import json
import html
import glob
import zipfile
import shutil
import subprocess
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR = os.path.join(HERE, 'vendor')
if VENDOR not in sys.path:
    sys.path.insert(0, VENDOR)

# --------------------------------------------------------------------------
# Extensions handled by this module. .docx/.pptx/.xlsx/.epub/.pdf stay with the
# original builder extractors (they already work well).
# --------------------------------------------------------------------------
MOBI_EXTS = {'.mobi', '.azw', '.azw3', '.azw4', '.prc', '.kf8'}
CHM_EXTS = {'.chm'}
RTF_EXTS = {'.rtf'}
TEX_EXTS = {'.tex', '.latex'}
FB2_EXTS = {'.fb2'}
ODF_EXTS = {'.odt', '.odp', '.ods', '.odg', '.ott', '.otp', '.ots'}
OOXML_EXTS = {'.docm', '.dotx', '.dotm',
              '.pptm', '.ppsx', '.ppsm', '.potx', '.potm',
              '.xlsm', '.xlsb', '.xltx', '.xltm'}
LEGACY_EXTS = {'.doc', '.ppt', '.xls'}

EXTS = (MOBI_EXTS | CHM_EXTS | RTF_EXTS | TEX_EXTS | FB2_EXTS |
        ODF_EXTS | OOXML_EXTS | LEGACY_EXTS)

OLE2_MAGIC = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
PANDOC = None
HH = r'C:\Windows\hh.exe'
POWERSHELL = r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'


def _find_pandoc():
    global PANDOC
    if PANDOC is not None:
        return PANDOC
    p = shutil.which('pandoc') or shutil.which('pandoc.exe')
    if not p:
        c = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Pandoc', 'pandoc.exe')
        if os.path.isfile(c):
            p = c
    PANDOC = p or ''
    return PANDOC


def clean_text(s, max_chars):
    s = re.sub(r'\s+', ' ', s or '').strip()
    return s[:max_chars]


def strip_markup(raw):
    raw = re.sub(r'(?is)<(script|style|noscript|head)[^>]*>.*?</\1>', ' ', raw)
    raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
    return html.unescape(raw)


def decode_best(raw):
    """CHM is often GB18030; other XML/HTML is UTF-8. Pick the sane decode."""
    try:
        u = raw.decode('utf-8')
        if u.count('\ufffd') < max(4, len(u) // 200):
            return u
    except UnicodeDecodeError:
        pass
    try:
        return raw.decode('gb18030', errors='replace')
    except Exception:
        return raw.decode('utf-8', errors='replace')


def read_plain(path, max_chars):
    with open(path, 'rb') as f:
        return clean_text(decode_best(f.read(max_chars * 2)), max_chars)


# --------------------------------------------------------------------------
# EPUB text (shared by .epub and the EPUB that mobi.extract produces)
# --------------------------------------------------------------------------
def epub_text(path, max_chars):
    out = []
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist()
                 if n.lower().endswith(('.xhtml', '.html', '.htm', '.txt'))]
        names.sort()
        for n in names[:120]:
            try:
                out.append(strip_markup(decode_best(z.read(n))))
            except Exception:
                continue
    return clean_text('\n'.join(out), max_chars)


# --------------------------------------------------------------------------
# MOBI / AZW via the vendored `mobi` package -> EPUB -> epub_text
# --------------------------------------------------------------------------
def extract_mobi(path, max_chars):
    try:
        import mobi
        try:
            from loguru import logger
            logger.remove()
        except Exception:
            pass
        tmpdir, outpath = mobi.extract(path)
        try:
            if outpath and os.path.isfile(outpath) and \
                    outpath.lower().endswith(('.epub', '.zip')):
                return epub_text(outpath, max_chars)
            # Fallback: walk the unpacked HTML files directly.
            parts = []
            for root, _dirs, files in os.walk(tmpdir):
                for fn in sorted(files):
                    if fn.lower().endswith(('.html', '.htm', '.xhtml', '.txt')):
                        fp = os.path.join(root, fn)
                        try:
                            with open(fp, 'rb') as fh:
                                parts.append(strip_markup(decode_best(fh.read())))
                        except Exception:
                            continue
                    if sum(len(p) for p in parts) > max_chars * 3:
                        break
                if sum(len(p) for p in parts) > max_chars * 3:
                    break
            return clean_text('\n'.join(parts), max_chars)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
    except Exception:
        return None


# --------------------------------------------------------------------------
# CHM via hh.exe -decompile (Windows HTML Help), GB18030-aware
# --------------------------------------------------------------------------
def extract_chm(path, max_chars):
    if not os.path.isfile(HH):
        return None
    outdir = tempfile.mkdtemp(prefix='kbchm_')
    try:
        try:
            subprocess.run([HH, '-decompile', outdir, path],
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=90)
        except Exception:
            return None
        files = []
        for root, _dirs, fns in os.walk(outdir):
            for fn in fns:
                if fn.lower().endswith(('.htm', '.html', '.xhtml', '.txt')):
                    files.append(os.path.join(root, fn))
        files.sort()
        parts, total = [], 0
        for fp in files[:250]:
            try:
                with open(fp, 'rb') as fh:
                    parts.append(strip_markup(decode_best(fh.read())))
                total += os.path.getsize(fp)
            except Exception:
                continue
            if total > 12 * 1024 * 1024:
                break
        return clean_text('\n'.join(parts), max_chars) or None
    finally:
        shutil.rmtree(outdir, ignore_errors=True)


# --------------------------------------------------------------------------
# RTF: pure-Python striprtf, pandoc as fallback
# --------------------------------------------------------------------------
def extract_rtf(path, max_chars):
    try:
        from striprtf.striprtf import rtf_to_text
        with open(path, 'rb') as f:
            raw = f.read(min(os.path.getsize(path), 20 * 1024 * 1024))
        txt = rtf_to_text(raw.decode('latin-1', errors='replace'))
        if txt and len(txt.strip()) > 20:
            return clean_text(txt, max_chars)
    except Exception:
        pass
    pandoc = _find_pandoc()
    if pandoc:
        try:
            r = subprocess.run([pandoc, '-f', 'rtf', '-t', 'plain', path],
                               capture_output=True, timeout=60)
            if r.returncode == 0:
                return clean_text(r.stdout.decode('utf-8', errors='replace'), max_chars)
        except Exception:
            pass
    return None


# --------------------------------------------------------------------------
# Generic ZIP+XML text: ODF, OOXML variants, FB2
# --------------------------------------------------------------------------
def _zip_xml_text(path, max_chars, prefixes=None, single=None):
    if single:
        with open(path, 'rb') as f:
            return clean_text(strip_markup(decode_best(f.read())), max_chars) or None
    try:
        with zipfile.ZipFile(path) as z:
            names = [n for n in z.namelist() if n.lower().endswith(('.xml', '.xhtml', '.html', '.htm'))]
            if prefixes:
                names = [n for n in names if any(n.lower().startswith(p) for p in prefixes)]
            names.sort()
            parts, total = [], 0
            for n in names[:200]:
                try:
                    raw = z.read(n)
                except Exception:
                    continue
                total += len(raw)
                parts.append(strip_markup(decode_best(raw)))
                if total > 12 * 1024 * 1024:
                    break
            return clean_text('\n'.join(parts), max_chars) or None
    except (zipfile.BadZipFile, OSError):
        return None


OOXML_PREFIXES = ('word/', 'ppt/slides/', 'ppt/notesSlides/', 'ppt/notesMasters/',
                  'xl/sharedStrings', 'xl/worksheets/')
ODF_NAMES = ('content.xml', 'styles.xml', 'meta.xml')


def extract_ooxml(path, max_chars):
    return _zip_xml_text(path, max_chars, prefixes=OOXML_PREFIXES)


def extract_odf(path, max_chars):
    try:
        with zipfile.ZipFile(path) as z:
            parts = []
            for n in ODF_NAMES:
                if n in z.namelist():
                    parts.append(strip_markup(decode_best(z.read(n))))
            return clean_text('\n'.join(parts), max_chars) or None
    except (zipfile.BadZipFile, OSError):
        return _zip_xml_text(path, max_chars)


# --------------------------------------------------------------------------
# Legacy binary Office: one COM instance per app, one PowerShell process.
# --------------------------------------------------------------------------
PS_SCRIPT = r'''
param([string]$Jobs, [string]$OutDir)
# The app selector comes from an environment variable: PowerShell 5.1 launched
# via -File from Python subprocess can silently drop a -App argument.
# IMPORTANT: PowerShell variables are case-INSENSITIVE, so the selector MUST
# NOT be named $App while the COM instance is $app — that overwrote it and made
# every `if ($App -eq 'word')` false, producing empty files.
$KbApp = $env:KB_APP
$ErrorActionPreference = 'Stop'
# PS 5.1's ConvertFrom-Json has a nasty bug: a top-level JSON *array* is
# emitted as ONE pipeline object, and -InputObject can even collapse it to a
# String. Avoid arrays entirely: feed JSONL (one {"p":..,"i":..} per line),
# where each ConvertFrom-Json call returns a single PSCustomObject.
# Paths come from this UTF-8 data file (never from PS1 literals): PowerShell
# 5.1 reads -File scripts with the console codepage and would mangle Chinese
# filenames hardcoded in the script.
try {
  $lines = Get-Content -LiteralPath $Jobs -Encoding UTF8
} catch { exit 2 }
$app = $null
try {
  if ($KbApp -eq 'word') {
    $app = New-Object -ComObject Word.Application
    $app.Visible = $false
    $app.DisplayAlerts = 0
    $app.AutomationSecurity = 3
  } elseif ($KbApp -eq 'ppt') {
    $app = New-Object -ComObject PowerPoint.Application
  } elseif ($KbApp -eq 'xls') {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false
    $app.DisplayAlerts = $false
    $app.AskToUpdateLinks = $false
  }
  $enc = New-Object System.Text.UTF8Encoding($false)
  foreach ($line in $lines) {
    if (-not $line.Trim()) { continue }
    try { $j = ConvertFrom-Json -InputObject $line } catch { continue }
    $p = [string]$j.p
    # Word COM URL-encodes mixed-slash paths containing spaces. Normalize to a
    # pure Windows backslash path before opening.
    $p = $p -replace '/', '\'
    $i = [int]$j.i
    $out = Join-Path $OutDir ("{0}.txt" -f $i)
    try {
      $text = ''
      if ($KbApp -eq 'word') {
        $d = $app.Documents.Open($p, $false, $true, $false)
        $text = $d.Content.Text
        $d.Close(0)
      } elseif ($KbApp -eq 'ppt') {
        $pres = $app.Presentations.Open($p, $true, $false, $true)
        $sb = New-Object System.Text.StringBuilder
        $n = 0
        foreach ($s in $pres.Slides) {
          $n += 1
          [void]$sb.AppendLine("[slide $n]")
          foreach ($sh in $s.Shapes) {
            try { if ($sh.HasTextFrame) { [void]$sb.AppendLine($sh.TextFrame.TextRange.Text) } } catch {}
            try {
              if ($sh.HasTable) {
                foreach ($r in $sh.Table.Rows) {
                  foreach ($c in $r.Cells) { [void]$sb.Append($c.Shape.TextFrame.TextRange.Text); [void]$sb.Append(' | ') }
                  [void]$sb.AppendLine()
                }
              }
            } catch {}
          }
        }
        $text = $sb.ToString()
        $pres.Close()
      } elseif ($KbApp -eq 'xls') {
        $wb = $app.Workbooks.Open($p, 0, $true)
        $sb = New-Object System.Text.StringBuilder
        foreach ($ws in $wb.Worksheets) {
          [void]$sb.AppendLine("[sheet " + $ws.Name + "]")
          try {
            $v = $ws.UsedRange.Value2
            $k = 0
            foreach ($x in $v) {
              if ($null -ne $x) { [void]$sb.Append([string]$x); [void]$sb.Append(' ') }
              $k += 1
              if ($k % 20 -eq 0) { [void]$sb.AppendLine() }
            }
            [void]$sb.AppendLine()
          } catch {}
        }
        $text = $sb.ToString()
        $wb.Close($false)
      }
      [System.IO.File]::WriteAllText($out, $text, $enc)
    } catch {
      try { [System.IO.File]::WriteAllText($out, '', $enc) } catch {}
      try { [System.IO.File]::WriteAllText((Join-Path $OutDir ("{0}.err" -f $i)), $_.Exception.Message, $enc) } catch {}
    }
  }
} finally {
  if ($null -ne $app) { try { $app.Quit() } catch {} }
}
'''


def legacy_kind(path):
    """Guard against Lucene `.doc` junk and plain-text `.DOC` files."""
    try:
        with open(path, 'rb') as f:
            head = f.read(4096)
    except OSError:
        return 'skip'
    if head.startswith(OLE2_MAGIC):
        return 'office'
    if b'\x00' in head[:512]:
        return 'skip'
    try:
        head.decode('utf-8')
        return 'plain'
    except UnicodeDecodeError:
        pass
    try:
        head.decode('gb18030')
        return 'plain'
    except UnicodeDecodeError:
        return 'skip'


def batch_office(files, max_chars, verbose=False):
    """Extract all legacy OLE2 .doc/.ppt/.xls with 1 COM instance per app.

    Returns ``{path: text}``. Missing results -> name-only in the builder.
    """
    out = {}
    if not os.path.isfile(POWERSHELL):
        return out
    groups = {'word': [], 'ppt': [], 'xls': []}
    for f in files:
        ext = '.' + f['ext']
        if ext not in LEGACY_EXTS:
            continue
        p = f['path']
        kind = legacy_kind(p)
        if kind == 'office':
            groups[{'.doc': 'word', '.ppt': 'ppt', '.xls': 'xls'}[ext]].append(p)
        elif kind == 'plain':
            try:
                out[p] = read_plain(p, max_chars)
            except Exception:
                pass
    workdir = tempfile.mkdtemp(prefix='kboffice_')
    try:
        ps_path = os.path.join(workdir, 'office.ps1')
        with io.open(ps_path, 'w', encoding='utf-8-sig') as fh:
            fh.write(PS_SCRIPT)
        for app, paths in groups.items():
            if not paths:
                continue
            outdir = os.path.join(workdir, app)
            os.makedirs(outdir, exist_ok=True)
            jobs_path = os.path.join(workdir, 'jobs_%s.jsonl' % app)
            with io.open(jobs_path, 'w', encoding='utf-8') as fh:
                for i, p in enumerate(paths):
                    fh.write(json.dumps({'p': p, 'i': i}, ensure_ascii=False) + '\n')
            timeout = max(90, min(420, len(paths) * 8))
            env = os.environ.copy()
            env['KB_APP'] = app
            try:
                subprocess.run(
                    [POWERSHELL, '-NoProfile', '-ExecutionPolicy', 'Bypass',
                     '-File', ps_path, '-Jobs', jobs_path, '-OutDir', outdir],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    timeout=timeout, env=env)
            except subprocess.TimeoutExpired:
                if verbose:
                    print('office %s timed out after %ss (kept partial)' % (app, timeout),
                          file=sys.stderr)
            except Exception as e:
                if verbose:
                    print('office %s failed: %s' % (app, e), file=sys.stderr)
            for i, p in enumerate(paths):
                fp = os.path.join(outdir, '%d.txt' % i)
                if not os.path.isfile(fp):
                    continue
                try:
                    with io.open(fp, 'r', encoding='utf-8') as fh:
                        txt = clean_text(fh.read(), max_chars)
                    if txt:
                        out[p] = txt
                except Exception:
                    continue
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
    return out


# --------------------------------------------------------------------------
# Public dispatcher
# --------------------------------------------------------------------------
def extract(path, ext, max_chars, office_text=None):
    """Return body text, '' for empty, or None when extraction isn't possible."""
    ext = ext.lower()
    if ext in LEGACY_EXTS:
        return (office_text or {}).get(path)
    if ext in MOBI_EXTS:
        return extract_mobi(path, max_chars)
    if ext in CHM_EXTS:
        return extract_chm(path, max_chars)
    if ext in RTF_EXTS:
        return extract_rtf(path, max_chars)
    if ext in TEX_EXTS:
        try:
            return read_plain(path, max_chars)
        except Exception:
            return None
    if ext in FB2_EXTS:
        return _zip_xml_text(path, max_chars, single=True)
    if ext in ODF_EXTS:
        return extract_odf(path, max_chars)
    if ext in OOXML_EXTS:
        return extract_ooxml(path, max_chars)
    return None


# --------------------------------------------------------------------------
# Self-test against real files on this machine (prints compact JSON only)
# --------------------------------------------------------------------------
def _selftest():
    import sqlite3
    db = os.path.join(os.path.expanduser('~'), '.dsh', 'local-kb', 'kb.sqlite')
    report = {'vendor': os.path.isdir(VENDOR), 'pandoc': bool(_find_pandoc()),
              'hh': os.path.isfile(HH), 'powershell': os.path.isfile(POWERSHELL),
              'checks': {}}
    if os.path.isfile(db):
        con = sqlite3.connect('file:%s?mode=ro' % db.replace('\\', '/'), uri=True)
        rows = con.execute("SELECT path, ext FROM docs WHERE ext IN ('doc','ppt','xls')").fetchall()
        con.close()
        files = [{'path': p, 'ext': e} for p, e in rows]
    else:
        files = []
    t0 = time.time()
    office = batch_office(files, 30000, verbose=True)
    report['office'] = {'files': len(files), 'extracted': len(office),
                        'chars': sum(len(v) for v in office.values()),
                        'seconds': round(time.time() - t0, 1)}
    sample = glob.glob(r'E:\MyFiles\02-Study\Textbooks\*.mobi')
    if sample:
        t = extract_mobi(sample[0], 3000)
        report['checks']['mobi'] = {'chars': len(t or ''), 'head': (t or '')[:80]}
    chm = glob.glob(r'E:\MyFiles\04-Documents\*.chm')
    if chm:
        t = extract_chm(chm[0], 3000)
        report['checks']['chm'] = {'chars': len(t or ''), 'head': (t or '')[:80]}
    rtf = glob.glob(r'C:\Users\hql\AppData\Local\Pandoc\*.rtf')
    if rtf:
        t = extract_rtf(rtf[0], 1000)
        report['checks']['rtf'] = {'chars': len(t or ''), 'head': (t or '')[:80]}
    dotm = glob.glob(r'C:\Users\hql\AppData\Roaming\Microsoft\Templates\*.dotm')
    if dotm:
        t = extract_ooxml(dotm[0], 3000)
        report['checks']['dotm'] = {'chars': len(t or ''), 'head': (t or '')[:80]}
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        _selftest()
    else:
        print('extra_extract: import this module from build_kb.py, or run --selftest')
