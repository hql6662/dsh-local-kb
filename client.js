window.__ModuleLoader__.load({
  id: 'dsh-local-kb',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-local-kb';

    const ZH = {
      label: '本地知识库',
      title: '本地知识库',
      subtitle: '全盘 C: / E: 文档索引 · 只检索片段，不把整库读进上下文',
      searchPlaceholder: '搜索文档内容或文件名…（中文 3 字以上走全文索引）',
      search: '搜索',
      searching: '检索中…',
      allTypes: '全部类型',
      allCategory: '全部分类',
      allRoot: '全部磁盘',
      personal: '个人文档',
      dev: '开发/缓存',
      noResults: '没有匹配结果，试试更短的关键词或放宽筛选。',
      resultsInfo: '约 {total} 条 · {ms}ms · {mode}',
      hintGet: '点击结果查看正文片段',
      preview: '正文预览',
      bodyChars: '正文 {n} 字',
      truncated: '（已截断）',
      openFile: '打开文件',
      reveal: '在资源管理器中显示',
      copyPath: '复制路径',
      copied: '已复制',
      close: '关闭',
      docs: '文档',
      indexedChars: '已索引字数',
      dbSize: '索引大小',
      builtAt: '建于',
      statusOk: '索引就绪',
      statusMissing: '索引尚未建立',
      rebuild: '重建索引',
      rebuilding: '正在重建…',
      rebuildStarted: '已开始重建，全盘扫描约需数分钟。可稍后回来查看。',
      rebuildDone: '重建完成',
      rebuildFailed: '重建失败（旧索引仍可用）',
      settings: '设置',
      roots: '扫描磁盘',
      maxChars: '单文档最大字数',
      python: 'Python 解释器',
      save: '保存设置',
      saved: '已保存（下次重建生效）',
      cancel: '取消',
      prev: '上一页',
      next: '下一页',
      page: '第 {n} 页',
      emptyQuery: '请输入关键词',
      nameOnly: '仅文件名（旧格式 .doc/.ppt/.xls 无法提取正文）',
      emptyDoc: '（无正文）',
      skipped: '（文件过大，跳过）',
      failed: '（提取失败）',
      byExt: '按类型',
      byCategory: '按分类',
      byRoot: '按磁盘',
    };
    const EN = {
      label: 'Local KB',
      title: 'Local Knowledge Base',
      subtitle: 'Full-disk C: / E: document index · snippets only, never the whole corpus in context',
      searchPlaceholder: 'Search document contents or filenames…',
      search: 'Search',
      searching: 'Searching…',
      allTypes: 'All types',
      allCategory: 'All categories',
      allRoot: 'All drives',
      personal: 'Personal',
      dev: 'Dev / cache',
      noResults: 'No matches. Try a shorter query or relax the filters.',
      resultsInfo: '~{total} hits · {ms}ms · {mode}',
      hintGet: 'Click a result to preview its text',
      preview: 'Text preview',
      bodyChars: '{n} chars',
      truncated: '(truncated)',
      openFile: 'Open file',
      reveal: 'Reveal in Explorer',
      copyPath: 'Copy path',
      copied: 'Copied',
      close: 'Close',
      docs: 'Documents',
      indexedChars: 'Indexed chars',
      dbSize: 'Index size',
      builtAt: 'Built',
      statusOk: 'Index ready',
      statusMissing: 'Index not built yet',
      rebuild: 'Rebuild index',
      rebuilding: 'Rebuilding…',
      rebuildStarted: 'Rebuild started — a full scan takes a few minutes. Check back later.',
      rebuildDone: 'Rebuild complete',
      rebuildFailed: 'Rebuild failed (old index still usable)',
      settings: 'Settings',
      roots: 'Drives to scan',
      maxChars: 'Max chars / doc',
      python: 'Python interpreter',
      save: 'Save settings',
      saved: 'Saved (applies on next rebuild)',
      cancel: 'Cancel',
      prev: 'Prev',
      next: 'Next',
      page: 'Page {n}',
      emptyQuery: 'Enter a query',
      nameOnly: 'Name only (legacy .doc/.ppt/.xls cannot be extracted)',
      emptyDoc: '(no body)',
      skipped: '(too large, skipped)',
      failed: '(extract failed)',
      byExt: 'By type',
      byCategory: 'By category',
      byRoot: 'By drive',
    };

    const CSS = `
.kb-page {
  --kb-accent: #6d5efc;
  --kb-accent-2: #22b8cf;
  --kb-bg: var(--dsw-alias-bg-base, #ffffff);
  --kb-card: var(--dsw-alias-bg-layer-1, #ffffff);
  --kb-card-2: var(--dsw-alias-bg-layer-2, #f5f6f8);
  --kb-border: var(--dsw-alias-border-l1, rgba(0,0,0,0.09));
  --kb-border-strong: var(--dsw-alias-border-l2, rgba(0,0,0,0.16));
  --kb-text: var(--dsw-alias-label-primary, #1f2328);
  --kb-muted: var(--dsw-alias-label-secondary, #6b7280);
  --kb-ok: var(--dsw-alias-state-success-primary, #16a34a);
  --kb-err: var(--dsw-alias-state-error-primary, #dc2626);
  height: 100%; min-height: 100%; overflow-y: auto; overflow-x: hidden;
  color: var(--kb-text);
  background:
    radial-gradient(760px 420px at 8% -12%, rgba(109,94,252,0.12), transparent 60%),
    radial-gradient(700px 420px at 96% -4%, rgba(34,184,207,0.10), transparent 58%),
    var(--kb-bg);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif);
}
.kb-page *, .kb-page *::before, .kb-page *::after { box-sizing: border-box; }
.kb-shell { width: min(1180px, 100%); margin: 0 auto; padding: 26px clamp(16px, 3vw, 36px) 56px; }

.kb-hero { position: relative; display: flex; align-items: flex-end; justify-content: space-between;
  gap: 20px; flex-wrap: wrap; padding: 22px 26px; border: 1px solid var(--kb-border);
  border-radius: 18px; background: linear-gradient(135deg, rgba(109,94,252,0.14), rgba(34,184,207,0.08) 58%, transparent 84%), var(--kb-card);
  box-shadow: 0 14px 36px rgba(15,23,42,0.06); }
.kb-hero h1 { margin: 6px 0 4px; font-size: 22px; font-weight: 750; letter-spacing: -0.01em; }
.kb-kicker { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.14em; color: var(--kb-muted); text-transform: uppercase; }
.kb-live { width: 7px; height: 7px; border-radius: 50%; background: var(--kb-ok); box-shadow: 0 0 0 4px rgba(22,163,74,0.14); }
.kb-sub { font-size: 12.5px; color: var(--kb-muted); margin: 0; max-width: 620px; line-height: 1.5; }
.kb-stats { display: flex; gap: 22px; flex-wrap: wrap; }
.kb-stat { display: flex; flex-direction: column; gap: 2px; min-width: 92px; }
.kb-stat b { font-size: 18px; font-weight: 750; }
.kb-stat span { font-size: 11px; color: var(--kb-muted); }

.kb-toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0 14px; align-items: center; }
.kb-search { flex: 1 1 380px; display: flex; align-items: center; gap: 10px; padding: 0 14px;
  border: 1px solid var(--kb-border-strong); border-radius: 12px; background: var(--kb-card); }
.kb-search svg { flex: none; color: var(--kb-muted); }
.kb-input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--kb-text);
  font-size: 14px; padding: 12px 0; font-family: inherit; }
.kb-input::placeholder { color: var(--kb-muted); }
.kb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
  border: 1px solid var(--kb-border-strong); background: var(--kb-card); color: var(--kb-text);
  border-radius: 10px; padding: 10px 15px; font-size: 13px; font-weight: 600; font-family: inherit; }
.kb-btn:hover { border-color: var(--kb-accent); }
.kb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.kb-btn--primary { background: var(--kb-accent); border-color: var(--kb-accent); color: #fff; }
.kb-btn--primary:hover { filter: brightness(1.06); }
.kb-btn--ghost { background: transparent; border-color: transparent; color: var(--kb-muted); padding: 8px 10px; }
.kb-btn--sm { padding: 6px 11px; font-size: 12px; }
.kb-select { border: 1px solid var(--kb-border-strong); background: var(--kb-card); color: var(--kb-text);
  border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; outline: 0; }
.kb-select:focus { border-color: var(--kb-accent); }

.kb-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--kb-muted); margin-bottom: 10px; }
.kb-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  background: var(--kb-card-2); border: 1px solid var(--kb-border); font-size: 11px; }
.kb-tag--ok { color: var(--kb-ok); }
.kb-tag--err { color: var(--kb-err); }
.kb-errbar { padding: 12px 16px; border: 1px solid var(--kb-err); border-radius: 12px;
  background: rgba(220,38,38,0.06); color: var(--kb-err); font-size: 13px; margin-bottom: 14px; }

.kb-results { display: flex; flex-direction: column; gap: 10px; }
.kb-card { border: 1px solid var(--kb-border); border-radius: 14px; background: var(--kb-card);
  padding: 14px 16px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.kb-card:hover { border-color: var(--kb-accent); box-shadow: 0 8px 24px rgba(15,23,42,0.07); }
.kb-card__top { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
.kb-card__name { font-size: 14px; font-weight: 700; word-break: break-all; }
.kb-chip { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 6px; background: rgba(109,94,252,0.10); color: var(--kb-accent); }
.kb-chip--gray { background: var(--kb-card-2); color: var(--kb-muted); }
.kb-card__path { font-size: 11.5px; color: var(--kb-muted); margin: 6px 0 0; word-break: break-all;
  font-family: var(--dsw-font-mono, ui-monospace, Consolas, monospace); }
.kb-card__snip { font-size: 13px; line-height: 1.6; margin: 9px 0 0; color: var(--kb-text); }
.kb-card__snip mark { background: rgba(109,94,252,0.18); color: inherit; border-radius: 3px; padding: 0 2px; }
.kb-card__foot { display: flex; gap: 14px; font-size: 11px; color: var(--kb-muted); margin-top: 9px; flex-wrap: wrap; }
.kb-empty { padding: 48px 20px; text-align: center; color: var(--kb-muted); font-size: 13px; }
.kb-pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; }

.kb-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(15,23,42,0.42);
  display: flex; justify-content: flex-end; }
.kb-drawer { width: min(640px, 92vw); height: 100%; background: var(--kb-bg); border-left: 1px solid var(--kb-border-strong);
  box-shadow: -16px 0 48px rgba(15,23,42,0.18); display: flex; flex-direction: column; }
.kb-drawer__head { padding: 18px 22px; border-bottom: 1px solid var(--kb-border); display: flex; align-items: flex-start; gap: 12px; }
.kb-drawer__head h2 { margin: 0 0 4px; font-size: 16px; word-break: break-all; }
.kb-drawer__head p { margin: 0; font-size: 11.5px; color: var(--kb-muted); word-break: break-all;
  font-family: var(--dsw-font-mono, ui-monospace, Consolas, monospace); }
.kb-drawer__body { flex: 1; overflow-y: auto; padding: 18px 22px; }
.kb-pre { white-space: pre-wrap; word-break: break-word; font-size: 12.5px; line-height: 1.7; margin: 0;
  font-family: var(--dsw-font-mono, ui-monospace, Consolas, monospace); }
.kb-drawer__foot { padding: 14px 22px; border-top: 1px solid var(--kb-border); display: flex; gap: 9px; flex-wrap: wrap; }

.kb-modal { position: fixed; inset: 0; z-index: 70; background: rgba(15,23,42,0.42);
  display: flex; align-items: center; justify-content: center; padding: 20px; }
.kb-dialog { width: min(480px, 100%); background: var(--kb-card); border: 1px solid var(--kb-border-strong);
  border-radius: 16px; padding: 22px; box-shadow: 0 24px 64px rgba(15,23,42,0.24); }
.kb-dialog h3 { margin: 0 0 16px; font-size: 16px; }
.kb-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.kb-field label { font-size: 12px; font-weight: 600; }
.kb-field small { color: var(--kb-muted); font-size: 11px; }
.kb-field input { border: 1px solid var(--kb-border-strong); border-radius: 9px; padding: 9px 11px;
  font-size: 13px; font-family: inherit; background: var(--kb-bg); color: var(--kb-text); outline: 0; }
.kb-dialog__foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 6px; }
.kb-note { font-size: 11.5px; color: var(--kb-muted); background: var(--kb-card-2); border-radius: 9px;
  padding: 10px 12px; line-height: 1.5; margin-top: 12px; }
.kb-spin { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor;
  border-right-color: transparent; border-radius: 50%; animation: kb-rotate 0.7s linear infinite; }
@keyframes kb-rotate { to { transform: rotate(360deg); } }
`;

    function fmt(n) {
      n = Number(n) || 0;
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
      return String(n);
    }
    function fmtBytes(n) {
      n = Number(n) || 0;
      if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
      if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
      if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
      return n + ' B';
    }
    function fmtTime(sec) {
      if (!sec) return '—';
      try { return new Date(Number(sec) * 1000).toLocaleString(); }
      catch { return String(sec); }
    }
    function renderSnippet(text) {
      // snippet() wraps the match in \u0001 / \u0002. Turn into <mark>.
      const parts = String(text || '').split(/(\u0001|\u0002)/g);
      const out = [];
      let mark = false;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === '\u0001') { mark = true; continue; }
        if (p === '\u0002') { mark = false; continue; }
        if (!p) continue;
        out.push(mark ? h('mark', { key: i }, p) : p);
      }
      return out.length ? out : [String(text || '')];
    }
    function statusText(status, t) {
      if (status === 'name-only') return t('nameOnly');
      if (status === 'empty') return t('emptyDoc');
      if (status === 'skipped') return t('skipped');
      if (status === 'failed') return t('failed');
      return '';
    }

    async function requestJson(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      });
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      return payload;
    }
    const api = (route, options) => requestJson(`/local-kb/api/${route}`, options);
    const qs = (obj) => {
      const params = new URLSearchParams();
      Object.entries(obj || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      });
      const s = params.toString();
      return s ? '?' + s : '';
    };

    function SearchIcon(props) {
      const size = Number(props?.size) || 18;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: 11, cy: 11, r: 7, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('path', { d: 'm20 20-3.2-3.2', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }));
    }
    function SidebarIcon(props) {
      const size = Number(props?.size) || 20;
      const active = Boolean(props?.active);
      const color = active ? 'var(--kb-accent, #6d5efc)' : 'currentColor';
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', style: { display: 'block' } },
        h('path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z', stroke: color, strokeWidth: 1.7, strokeLinejoin: 'round' }),
        h('path', { d: 'M4 19V5.5', stroke: color, strokeWidth: 1.7 }),
        h('path', { d: 'M9 8h6M9 11.5h6M9 15h4', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' }),
        active ? h('circle', { cx: 19, cy: 5, r: 2.2, fill: color }) : null);
    }

    function createMainPanel(ctx, t) {
      return function MainPanel() {
        const [stats, setStats] = React.useState(null);
        const [config, setConfig] = React.useState(null);
        const [query, setQuery] = React.useState('');
        const [submitted, setSubmitted] = React.useState('');
        const [filters, setFilters] = React.useState({ ext: '', category: '', root: '' });
        const [result, setResult] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [offset, setOffset] = React.useState(0);
        const [preview, setPreview] = React.useState(null);
        const [previewLoading, setPreviewLoading] = React.useState(false);
        const [settingsOpen, setSettingsOpen] = React.useState(false);
        const [rebuild, setRebuild] = React.useState({ running: false, ok: null, error: '', finishedAt: 0 });
        const [toast, setToast] = React.useState('');
        const inputRef = React.useRef(null);
        const pollRef = React.useRef(null);

        const limit = 20;

        function flash(message) {
          setToast(message);
          window.setTimeout(() => setToast(''), 2600);
        }

        async function loadMeta() {
          try {
            const [s, c] = await Promise.all([api('stats'), api('config')]);
            setStats(s.ok ? s : null);
            setConfig(c.config || null);
          } catch (e) { setError(String(e.message || e)); }
          try { const r = await api('rebuild/status'); setRebuild(r); } catch { /* ignore */ }
        }

        React.useEffect(() => {
          loadMeta();
          return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
        }, []);

        // Poll rebuild progress while it is running; refresh stats when done.
        React.useEffect(() => {
          if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
          if (!rebuild.running) return;
          pollRef.current = window.setInterval(async () => {
            try {
              const r = await api('rebuild/status');
              setRebuild(r);
              if (!r.running) {
                window.clearInterval(pollRef.current); pollRef.current = null;
                if (r.ok) { flash(t('rebuildDone')); loadMeta(); }
                else if (r.ok === false) flash(t('rebuildFailed'));
              }
            } catch { /* ignore */ }
          }, 2500);
          return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
        }, [rebuild.running]);

        async function runSearch(nextOffset = 0) {
          const q = (submitted || query).trim();
          if (!q) { flash(t('emptyQuery')); return; }
          setLoading(true); setError(''); setOffset(nextOffset);
          try {
            const r = await api('search' + qs({ q, limit, offset: nextOffset,
              ext: filters.ext, category: filters.category, root: filters.root }));
            setResult(r);
          } catch (e) { setError(String(e.message || e)); setResult(null); }
          finally { setLoading(false); }
        }

        function submit(e) {
          e?.preventDefault?.();
          setSubmitted(query.trim());
          // run on next tick so submitted state is visible; call directly with query.
          const q = query.trim();
          if (!q) { flash(t('emptyQuery')); return; }
          setLoading(true); setError(''); setOffset(0);
          api('search' + qs({ q, limit, offset: 0,
            ext: filters.ext, category: filters.category, root: filters.root }))
            .then((r) => setResult(r))
            .catch((err) => { setError(String(err.message || err)); setResult(null); })
            .finally(() => setLoading(false));
        }

        async function openPreview(item) {
          setPreview({ ...item, body: '', bodyChars: 0, bodyTruncated: false, loading: true });
          setPreviewLoading(true);
          try {
            const r = await api('doc' + qs({ id: item.id, max: 8000 }));
            setPreview({ ...item, ...r, loading: false });
          } catch (e) {
            setPreview({ ...item, body: String(e.message || e), loading: false });
          } finally { setPreviewLoading(false); }
        }

        async function doRebuild() {
          try {
            const r = await api('rebuild', { method: 'POST', body: '{}' });
            if (r.ok) { setRebuild({ running: true, ok: null, error: '', startedAt: Date.now(), finishedAt: 0 }); flash(t('rebuildStarted')); }
            else { flash(r.error || 'error'); }
          } catch (e) { flash(String(e.message || e)); }
        }

        async function saveSettings(next) {
          try {
            const r = await api('config', { method: 'POST', body: JSON.stringify(next) });
            setConfig(r.config);
            setSettingsOpen(false);
            flash(t('saved'));
          } catch (e) { flash(String(e.message || e)); }
        }

        async function copyPath(p) {
          try { await navigator.clipboard.writeText(p); flash(t('copied')); }
          catch { flash(p); }
        }

        const exts = stats?.byExt ? Object.keys(stats.byExt) : [];
        const ready = Boolean(stats?.ok);
        const builtAt = stats?.meta?.built_at || '';
        const page = Math.floor(offset / limit) + 1;

        return h('div', { className: 'kb-page' },
          h('div', { className: 'kb-shell' },
            // ---- hero
            h('div', { className: 'kb-hero' },
              h('div', null,
                h('div', { className: 'kb-kicker' },
                  h('span', { className: 'kb-live', style: ready ? {} : { background: 'var(--kb-err)' } }),
                  ready ? t('statusOk') : t('statusMissing')),
                h('h1', null, t('title')),
                h('p', { className: 'kb-sub' }, t('subtitle'))),
              h('div', { className: 'kb-stats' },
                h('div', { className: 'kb-stat' }, h('b', null, fmt(stats?.total)), h('span', null, t('docs'))),
                h('div', { className: 'kb-stat' }, h('b', null, fmt(stats?.indexedChars)), h('span', null, t('indexedChars'))),
                h('div', { className: 'kb-stat' }, h('b', null, fmtBytes(stats?.dbSize)), h('span', null, t('dbSize'))),
                h('div', { className: 'kb-stat' }, h('b', null, builtAt ? builtAt.slice(5, 16) : '—'), h('span', null, t('builtAt'))))),
            // ---- toolbar
            h('form', { className: 'kb-toolbar', onSubmit: submit },
              h('div', { className: 'kb-search' },
                h(SearchIcon, { size: 17 }),
                h('input', { ref: inputRef, className: 'kb-input', value: query,
                  placeholder: t('searchPlaceholder'),
                  onChange: (e) => setQuery(e.target.value) })),
              h('button', { type: 'submit', className: 'kb-btn kb-btn--primary', disabled: loading },
                loading ? h('span', { className: 'kb-spin' }) : null,
                loading ? t('searching') : t('search')),
              h('select', { className: 'kb-select', value: filters.ext,
                onChange: (e) => setFilters((o) => ({ ...o, ext: e.target.value })) },
                h('option', { value: '' }, t('allTypes')),
                exts.map((x) => h('option', { key: x, value: x }, '.' + x + '  (' + stats.byExt[x] + ')'))),
              h('select', { className: 'kb-select', value: filters.category,
                onChange: (e) => setFilters((o) => ({ ...o, category: e.target.value })) },
                h('option', { value: '' }, t('allCategory')),
                h('option', { value: 'personal' }, t('personal')),
                h('option', { value: 'dev' }, t('dev'))),
              h('select', { className: 'kb-select', value: filters.root,
                onChange: (e) => setFilters((o) => ({ ...o, root: e.target.value })) },
                h('option', { value: '' }, t('allRoot')),
                h('option', { value: 'C:' }, 'C:'),
                h('option', { value: 'E:' }, 'E:')),
              h('button', { type: 'button', className: 'kb-btn kb-btn--ghost', onClick: () => setSettingsOpen(true) }, t('settings')),
              h('button', { type: 'button', className: 'kb-btn', onClick: doRebuild, disabled: rebuild.running },
                rebuild.running ? h('span', { className: 'kb-spin' }) : null,
                rebuild.running ? t('rebuilding') : t('rebuild'))),
            // ---- status line
            h('div', { className: 'kb-meta' },
              h('span', { className: 'kb-tag' + (ready ? ' kb-tag--ok' : ' kb-tag--err') },
                ready ? t('statusOk') : t('statusMissing')),
              stats?.byCategory ? h('span', { className: 'kb-tag' },
                t('personal') + ' ' + fmt(stats.byCategory.personal) + ' · ' + t('dev') + ' ' + fmt(stats.byCategory.dev)) : null,
              stats?.byRoot ? h('span', { className: 'kb-tag' }, t('byRoot') + ' ' +
                Object.entries(stats.byRoot).map(([k, v]) => k + ' ' + fmt(v)).join(' · ')) : null,
              rebuild.ok === false ? h('span', { className: 'kb-tag kb-tag--err' }, rebuild.error || t('rebuildFailed')) : null),
            error ? h('div', { className: 'kb-errbar' }, error) : null,
            // ---- results
            result ? h('div', { className: 'kb-meta' },
              h('span', null, t('resultsInfo')
                .replace('{total}', result.total).replace('{ms}', result.elapsedMs).replace('{mode}', result.mode)),
              h('span', null, t('hintGet'))) : null,
            result && result.results.length
              ? h('div', { className: 'kb-results' },
                  result.results.map((r) =>
                    h('div', { key: r.id, className: 'kb-card', onClick: () => openPreview(r) },
                      h('div', { className: 'kb-card__top' },
                        h('span', { className: 'kb-card__name' }, r.name),
                        h('span', { className: 'kb-chip' }, '.' + r.ext),
                        h('span', { className: 'kb-chip kb-chip--gray' }, r.category === 'dev' ? t('dev') : t('personal')),
                        statusText(r.status, t) ? h('span', { className: 'kb-chip kb-chip--gray' }, statusText(r.status, t)) : null),
                      h('p', { className: 'kb-card__path' }, r.path),
                      r.snippet ? h('p', { className: 'kb-card__snip' }, renderSnippet(r.snippet)) : null,
                      h('div', { className: 'kb-card__foot' },
                        h('span', null, fmt(r.chars) + ' ' + t('docs').toLowerCase()),
                        h('span', null, fmtBytes(r.size)),
                        h('span', null, fmtTime(r.mtime))))),
                  (result.total > limit)
                    ? h('div', { className: 'kb-pager' },
                        h('button', { className: 'kb-btn kb-btn--sm', disabled: offset <= 0 || loading,
                          onClick: () => runSearch(Math.max(0, offset - limit)) }, t('prev')),
                        h('span', null, t('page').replace('{n}', page)),
                        h('button', { className: 'kb-btn kb-btn--sm', disabled: loading || offset + limit >= result.total,
                          onClick: () => runSearch(offset + limit) }, t('next')))
                    : null)
              : (result && !loading ? h('div', { className: 'kb-empty' }, t('noResults')) : null)),
          // ---- toast
          toast ? h('div', { style: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 90, background: 'var(--kb-text, #1f2328)', color: 'var(--kb-bg, #fff)',
            padding: '10px 18px', borderRadius: 10, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.2)' } }, toast) : null,
          // ---- preview drawer
          preview ? h('div', { className: 'kb-overlay', onClick: () => setPreview(null) },
            h('div', { className: 'kb-drawer', onClick: (e) => e.stopPropagation() },
              h('div', { className: 'kb-drawer__head' },
                h('div', { style: { flex: 1 } },
                  h('h2', null, preview.name),
                  h('p', null, preview.path)),
                h('button', { className: 'kb-btn kb-btn--ghost', onClick: () => setPreview(null) }, t('close'))),
              h('div', { className: 'kb-drawer__body' },
                preview.loading
                  ? h('div', { className: 'kb-empty' }, h('span', { className: 'kb-spin' }))
                  : h('div', null,
                      h('div', { className: 'kb-meta' },
                        h('span', { className: 'kb-tag' }, '.' + preview.ext),
                        h('span', null, t('bodyChars').replace('{n}', fmt(preview.bodyChars || 0)) +
                          (preview.bodyTruncated ? ' ' + t('truncated') : ''))),
                      h('pre', { className: 'kb-pre' }, preview.body || (preview.error || '')))),
              h('div', { className: 'kb-drawer__foot' },
                h('button', { className: 'kb-btn kb-btn--primary kb-btn--sm',
                  onClick: () => api('open', { method: 'POST', body: JSON.stringify({ id: preview.id }) }) }, t('openFile')),
                h('button', { className: 'kb-btn kb-btn--sm',
                  onClick: () => api('reveal', { method: 'POST', body: JSON.stringify({ id: preview.id }) }) }, t('reveal')),
                h('button', { className: 'kb-btn kb-btn--sm', onClick: () => copyPath(preview.path) }, t('copyPath')))))
            : null,
          // ---- settings dialog
          settingsOpen ? h(SettingsDialog, { config: config || {}, t, onCancel: () => setSettingsOpen(false), onSave: saveSettings }) : null);
      };
    }

    function SettingsDialog(props) {
      const { config, t, onCancel, onSave } = props;
      const [roots, setRoots] = React.useState(config.roots || 'C:/,E:/');
      const [maxChars, setMaxChars] = React.useState(String(config.maxChars || 30000));
      const [python, setPython] = React.useState(config.python || '');
      return h('div', { className: 'kb-modal', onClick: onCancel },
        h('div', { className: 'kb-dialog', onClick: (e) => e.stopPropagation() },
          h('h3', null, t('settings')),
          h('div', { className: 'kb-field' },
            h('label', null, t('roots')),
            h('input', { value: roots, onChange: (e) => setRoots(e.target.value) }),
            h('small', null, 'C:/,E:/')),
          h('div', { className: 'kb-field' },
            h('label', null, t('maxChars')),
            h('input', { type: 'number', value: maxChars, onChange: (e) => setMaxChars(e.target.value) }),
            h('small', null, '30000')),
          h('div', { className: 'kb-field' },
            h('label', null, t('python')),
            h('input', { value: python, placeholder: 'C:/Python314/python.exe', onChange: (e) => setPython(e.target.value) })),
          h('div', { className: 'kb-note' }, t('rebuildStarted')),
          h('div', { className: 'kb-dialog__foot' },
            h('button', { className: 'kb-btn', onClick: onCancel }, t('cancel')),
            h('button', { className: 'kb-btn kb-btn--primary',
              onClick: () => onSave({ roots, maxChars: Number(maxChars) || 30000, python }) }, t('save')))));
    }

    const inject = ['slots', 'sessions', 'locale'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-local-kb: locale dictionaries');
      const t = ctx.locale.bind(NS);

      document.querySelectorAll('style[data-dsh-local-kb]').forEach((node) => node.remove());
      const style = document.createElement('style');
      style.dataset.dshLocalKb = 'true';
      style.setAttribute('data-dsh-local-kb', 'true');
      style.textContent = CSS;
      document.head.appendChild(style);
      ctx.effect(() => () => style.remove(), 'dsh-local-kb: styles');

      const MainPanel = createMainPanel(ctx, t);
      ctx.slots.inject('main', () =>
        ctx.slots.inject('sidebar.panellist', () => {
          const stopMain = ctx.slots.register({ name: 'main', key: 'local-kb' }, MainPanel);
          const stopIcon = ctx.slots.register(
            { name: 'sidebar.panellist', id: 'local-kb', order: 45, label: () => t('label'), locale: NS },
            SidebarIcon);
          return () => { stopIcon?.(); stopMain(); };
        }));
    }

    return { name: NS, inject, apply };
  },
});
