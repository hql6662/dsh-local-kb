window.__ModuleLoader__.load({
  id: 'dsh-local-kb',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-local-kb';

    const ZH = {
      label: '本地知识库',
      title: '本地知识库',
      subtitle: '全盘 C: / E: 文档索引 · 文件名 / 正文 / 路径都可搜 · 只返回片段，不把整库读进上下文',
      searchPlaceholder: '搜索文件名、正文或路径目录…（中文 3 字以上走全文索引）',
      search: '搜索',
      searching: '检索中…',
      browse: '浏览',
      browseHint: '不知道文件名和内容？留空关键词，按时间 / 目录 / 类型翻一翻',
      browseInfo: '浏览最近文件 · 共 {total} 条 · {ms}ms',
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
      pathFilter: '路径含…',
      pathPlaceholder: 'Desktop / 实验三 / xwechat',
      allDays: '不限时间',
      days7: '最近 7 天',
      days30: '最近 30 天',
      days365: '最近 1 年',
      sortRel: '按相关度',
      sortMtime: '按修改时间',
      sortName: '按名称',
      // content classification
      aiLabel: 'AI 批量识别',
      aiLabeling: '唤起中…',
      aiLabelStarted: '已唤起 DSH Agent 做内容识别，完成后回来刷新即可',
      aiLabelFailed: '唤起失败',
      usefulHigh: '高价值',
      usefulPossible: '待定',
      usefulLow: '低价值/噪声',
      allUseful: '全部有用度',
      topicStudy: '学习', topicWork: '工作', topicCode: '代码',
      topicLife: '生活', topicReference: '资料', topicOther: '其他',
      allTopic: '全部主题',
      allSrc: '全部来源',
      labelSrcAi: '仅 AI 标注',
      labelSrcRule: '仅规则标注',
      labelStats: '高价值 {high} · 待定 {possible} · 低价值 {low} · AI 已标 {ai}',
      setHigh: '标为高价值',
      setLow: '标为低价值',
      labeled: '已标注',
      classifyHint: '规则已给全部文档预打「有用度 + 主题」双标签；点「AI 批量识别」让 Agent 复核（首次会看得更细，之后只处理新增文件）',
      fullPass: '首次全量识别',
      incrementalPass: '增量识别',
      modeFull: '首次全量（不省 token）',
      modeIncremental: '增量（省 token）',
      firstPassPending: '首次全量识别未完成 · 点「AI 批量识别」放开跑一轮',
      firstPassDone: '首次全量已完成 · 之后只识别新增文件',
      pendingNew: '{n} 篇新增待识别',
      markFirstPassDone: '标记首次全量已完成',
      firstPassMarked: '已记录：之后重建只识别新增文件',
      rerunFull: '重新全量识别',
      toggleFirstPassHint: '点击切换：未完成 = 下次跑首次全量；已完成 = 只识别新增文件',
    };
    const EN = {
      label: 'Local KB',
      title: 'Local Knowledge Base',
      subtitle: 'Full-disk C: / E: index · searchable name + body + path · snippets only, never the whole corpus in context',
      searchPlaceholder: 'Search filenames, text, or folder names…',
      search: 'Search',
      searching: 'Searching…',
      browse: 'Browse',
      browseHint: 'No filename and no content? Leave the query empty and flip through by time / folder / type',
      browseInfo: 'Recent files · {total} · {ms}ms',
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
      pathFilter: 'Path has…',
      pathPlaceholder: 'Desktop / notes / work',
      allDays: 'Any time',
      days7: 'Last 7 days',
      days30: 'Last 30 days',
      days365: 'Last year',
      sortRel: 'Relevance',
      sortMtime: 'Modified',
      sortName: 'Name',
      // content classification
      aiLabel: 'AI classify',
      aiLabeling: 'Starting…',
      aiLabelStarted: 'DSH Agent started classifying. Refresh here when it finishes.',
      aiLabelFailed: 'Failed to start',
      usefulHigh: 'High value',
      usefulPossible: 'Uncertain',
      usefulLow: 'Low / noise',
      allUseful: 'All usefulness',
      topicStudy: 'Study', topicWork: 'Work', topicCode: 'Code',
      topicLife: 'Life', topicReference: 'Reference', topicOther: 'Other',
      allTopic: 'All topics',
      allSrc: 'All sources',
      labelSrcAi: 'AI-labeled only',
      labelSrcRule: 'Rule-labeled only',
      labelStats: 'High {high} · Uncertain {possible} · Low {low} · AI-labeled {ai}',
      setHigh: 'Mark high value',
      setLow: 'Mark low value',
      labeled: 'Labeled',
      classifyHint: 'A zero-cost rule baseline tags every doc; click "AI classify" to have the Agent review them (thorough the first time, incremental afterwards)',
      fullPass: 'First full pass',
      incrementalPass: 'Incremental pass',
      modeFull: 'Full pass (no token limit)',
      modeIncremental: 'Incremental (token-saving)',
      firstPassPending: 'First full pass not finished yet — click "AI classify" and let it run',
      firstPassDone: 'First full pass done — later passes only review new files',
      pendingNew: '{n} new docs to review',
      markFirstPassDone: 'Mark first pass done',
      firstPassMarked: 'Recorded: rebuilds will only review new files',
      rerunFull: 'Run a full pass again',
      toggleFirstPassHint: 'Click to toggle: unfinished = next run is a thorough full pass; finished = only new files',
    };

    // Two-tier prompt: the first pass after a fresh index may spend tokens
    // (it is the only chance to classify everything properly); every later
    // pass is incremental and must stay cheap.
    function buildAiPrompt(status) {
      const first = !status || !status.firstPassDone;
      if (first) {
        return `你是「本地知识库」的内容识别助手。**这是首次全量识别**：目标是把全盘文档尽量都打上双标签，这一轮不用刻意省 token。

标签：useful（high=确实有用/值得保留、possible=拿不准、low=噪声/缓存/临时/重复）+ topic（study/work/code/life/reference/other）。

流程：
1. kb {"action":"candidates","limit":50} —— 首次返回的是全量队列（按「高价值→长文→新」排序），每条含 id/文件名/路径/开头 400 字。
2. 逐条判断 useful 与 topic，给 ≤20 字 why。**拿不准时可以放心调用** kb {"action":"get","id":...,"max":3000} 读正文再判——这一轮读正文是允许的。
3. 用 ONE 次 kb {"action":"label","items":[{"id":1,"useful":"high","topic":"study","why":"课程实验报告"}, ...]} 把整批写回（一次 30-50 条），这是最省往返的方式。
4. 重复 1-3 直到 kb {"action":"candidates"} 返回 0 条，或覆盖了主要目录（可换 "q2":"目录关键词" 推进不同分区）。
5. 完成后调用 kb {"action":"label-status","reset":false} 记录首次全量已完成 —— 这一步很关键：之后每次重建就只会识别新增文件了。

注意：已有 AI 标注的文档也会出现在首次队列里，如果发现规则判错就直接改。`;
      }
      return `你是「本地知识库」的内容识别助手。**这是增量识别**（首次全量已完成）：只处理上次之后新增/变动的文件，务必省 token。

1. kb {"action":"candidates"} —— 默认就是增量模式：只返回还没有 AI 标注的文档，每条只有 id/文件名/路径/开头 200 字，**不含正文**。
2. 只看 id/name/path/head 判断 useful（high/possible/low）与 topic（study/work/code/life/reference/other），给 ≤20 字 why。
3. 用 ONE 次 kb {"action":"label","items":[...]} 批量写回（一次 30-50 条）。
4. 重复直到返回 0 条。绝大多数情况下**不要**调用 get 读正文；除非某个文件明显很重要但开头完全看不出内容，才用 max=1500 看一眼。

完成后简短汇报共标注多少条即可。`;
    }

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
.kb-input--sm { border: 1px solid var(--kb-border-strong); background: var(--kb-card);
  color: var(--kb-text); border-radius: 10px; padding: 10px 12px; font-size: 13px;
  font-family: inherit; outline: 0; width: 150px; }
.kb-input--sm:focus { border-color: var(--kb-accent); }
.kb-input--sm::placeholder { color: var(--kb-muted); }
.kb-chip--high { background: rgba(22,163,74,.14); color: #15803d; }
.kb-chip--low { background: rgba(107,114,128,.14); color: var(--kb-muted); }
.kb-chip--possible { background: rgba(217,150,0,.13); color: #a16207; }
.kb-chip--topic { background: rgba(34,184,207,.15); color: #0e7490; text-transform: none; letter-spacing: 0; }
.kb-chip--ai { background: rgba(109,94,252,.15); color: var(--kb-accent); }
.kb-btn--ai { background: linear-gradient(120deg, rgba(109,94,252,.16), rgba(34,184,207,.16));
  border-color: var(--kb-accent); color: var(--kb-accent); font-weight: 600; }
.kb-hint { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--kb-muted);
  margin: -4px 0 12px; }

.kb-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--kb-muted); margin-bottom: 10px; }
.kb-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  background: var(--kb-card-2); border: 1px solid var(--kb-border); font-size: 11px; }
.kb-tag--ok { color: var(--kb-ok); }
.kb-tag--warn { color: #b45309; border-color: rgba(180,83,9,.35); background: rgba(245,158,11,.10); }
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

    const USEFUL_CLASS = { high: 'kb-chip--high', possible: 'kb-chip--possible', low: 'kb-chip--low' };
    function usefulLabel(v, t) {
      return v === 'high' ? t('usefulHigh') : v === 'low' ? t('usefulLow') : t('usefulPossible');
    }
    function topicLabel(v, t) {
      const map = { study: 'topicStudy', work: 'topicWork', code: 'topicCode',
        life: 'topicLife', reference: 'topicReference', other: 'topicOther' };
      return t(map[v] || 'topicOther');
    }

    function createMainPanel(ctx, t) {
      return function MainPanel() {
        const [stats, setStats] = React.useState(null);
        const [config, setConfig] = React.useState(null);
        const [query, setQuery] = React.useState('');
        const [submitted, setSubmitted] = React.useState('');
        const [filters, setFilters] = React.useState(
          { ext: '', category: '', root: '', path: '', days: '', sort: '',
            useful: '', topic: '', labelSrc: '' });
        const [result, setResult] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [offset, setOffset] = React.useState(0);
        const [preview, setPreview] = React.useState(null);
        const [previewLoading, setPreviewLoading] = React.useState(false);
        const [settingsOpen, setSettingsOpen] = React.useState(false);
        const [rebuild, setRebuild] = React.useState({ running: false, ok: null, error: '', finishedAt: 0 });
        const [toast, setToast] = React.useState('');
        const [aiBusy, setAiBusy] = React.useState(false);
        const [labelStatus, setLabelStatus] = React.useState(null);
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
          try { const ls = await api('labels/status'); setLabelStatus(ls.ok ? ls : null); } catch { /* ignore */ }
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

        function paramsFor(q, nextOffset) {
          return { q, limit, offset: nextOffset,
            ext: filters.ext, category: filters.category, root: filters.root,
            path: filters.path, days: filters.days, sort: filters.sort,
            useful: filters.useful, topic: filters.topic, labelSrc: filters.labelSrc };
        }

        async function runSearch(nextOffset = 0) {
          const q = (submitted || query).trim();
          // Empty query = BROWSE (recent files). Never block it.
          setLoading(true); setError(''); setOffset(nextOffset);
          try {
            const r = await api('search' + qs(paramsFor(q, nextOffset)));
            setResult(r);
          } catch (e) { setError(String(e.message || e)); setResult(null); }
          finally { setLoading(false); }
        }

        function submit(e) {
          e?.preventDefault?.();
          const q = query.trim();
          setSubmitted(q);
          setLoading(true); setError(''); setOffset(0);
          api('search' + qs(paramsFor(q, 0)))
            .then((r) => setResult(r))
            .catch((err) => { setError(String(err.message || err)); setResult(null); })
            .finally(() => setLoading(false));
        }

        function doBrowse() {
          setQuery(''); setSubmitted('');
          setLoading(true); setError(''); setOffset(0);
          api('search' + qs(paramsFor('', 0)))
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

        // One-click: open a DSH Agent session. The FIRST run is a thorough full
        // pass (tokens are fine there); later runs are incremental and cheap.
        async function aiClassify() {
          setAiBusy(true);
          const sessions = ctx.get?.('sessions') ?? ctx.sessions;
          const ui = ctx.get?.('uiWorkspace') ?? ctx.uiWorkspace;
          const prompt = buildAiPrompt(labelStatus);
          let lastError = null;
          try {
            if (sessions?.create && sessions?.using) {
              try {
                const sessionId = await sessions.create({});
                await sessions.using(sessionId, { source: 'gateway' }, async (ref) => {
                  const r = await ref.binding.session.prompt([{ type: 'text', text: prompt }], 'queue');
                  if (!r?.ok) throw new Error(r?.error?.message || 'send failed');
                });
                try { ui?.openSession?.(sessionId); } catch { /* not fatal */ }
                // The Agent records completion itself; if this was the first
                // full pass, remember it here too so later runs stay cheap
                // even if the Agent forgets.
                if (labelStatus && !labelStatus.firstPassDone) {
                  try { await api('labels/first-pass', { method: 'POST', body: JSON.stringify({}) }); } catch { /* ignore */ }
                  try { setLabelStatus(await api('labels/status')); } catch { /* ignore */ }
                }
                flash(labelStatus && !labelStatus.firstPassDone ? t('firstPassMarked') : t('aiLabelStarted'));
                return;
              } catch (error) { lastError = error; }
            }
            if (ui?.startSession) {
              ui.startSession(undefined, { prompt, whenDraftExists: 'replace' });
              flash(t('aiLabelStarted'));
              return;
            }
            throw lastError || new Error('no session api');
          } catch (e) {
            flash(t('aiLabelFailed') + '：' + String(e?.message || e));
          } finally { setAiBusy(false); }
        }

        // Flip the first-pass flag by hand (for example after a manual run).
        async function toggleFirstPass() {
          try {
            const next = !(labelStatus && labelStatus.firstPassDone);
            await api('labels/first-pass', { method: 'POST', body: JSON.stringify({ reset: !next }) });
            setLabelStatus(await api('labels/status'));
            flash(next ? t('firstPassMarked') : t('rerunFull'));
          } catch (e) { flash(String(e?.message || e)); }
        }

        // Quick per-document label from the preview drawer.
        async function quickLabel(useful) {
          if (!preview) return;
          try {
            await api('labels', { method: 'POST', body: JSON.stringify({
              items: [{ id: preview.id, useful, topic: preview.topic, why: 'panel quick label' }] }) });
            setPreview((p) => p ? { ...p, useful, labelSrc: 'ai' } : p);
            setResult((r) => r ? { ...r, results: r.results.map((x) =>
              x.id === preview.id ? { ...x, useful, labelSrc: 'ai' } : x) } : r);
            flash(t('labeled'));
            loadMeta();
          } catch (e) { flash(String(e?.message || e)); }
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
              h('button', { type: 'button', className: 'kb-btn kb-btn--ghost', onClick: doBrowse, disabled: loading },
                t('browse')),
              h('input', { className: 'kb-input--sm', value: filters.path,
                placeholder: t('pathPlaceholder'),
                onChange: (e) => setFilters((o) => ({ ...o, path: e.target.value })) }),
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
              h('select', { className: 'kb-select', value: filters.days,
                onChange: (e) => setFilters((o) => ({ ...o, days: e.target.value })) },
                h('option', { value: '' }, t('allDays')),
                h('option', { value: '7' }, t('days7')),
                h('option', { value: '30' }, t('days30')),
                h('option', { value: '365' }, t('days365'))),
              h('select', { className: 'kb-select', value: filters.sort,
                onChange: (e) => setFilters((o) => ({ ...o, sort: e.target.value })) },
                h('option', { value: '' }, t('sortRel')),
                h('option', { value: 'mtime' }, t('sortMtime')),
                h('option', { value: 'name' }, t('sortName'))),
              h('select', { className: 'kb-select', value: filters.useful,
                onChange: (e) => setFilters((o) => ({ ...o, useful: e.target.value })) },
                h('option', { value: '' }, t('allUseful')),
                h('option', { value: 'high' }, t('usefulHigh')),
                h('option', { value: 'possible' }, t('usefulPossible')),
                h('option', { value: 'low' }, t('usefulLow'))),
              h('select', { className: 'kb-select', value: filters.topic,
                onChange: (e) => setFilters((o) => ({ ...o, topic: e.target.value })) },
                h('option', { value: '' }, t('allTopic')),
                ['study', 'work', 'code', 'life', 'reference', 'other'].map((v) =>
                  h('option', { key: v, value: v }, topicLabel(v, t)))),
              h('select', { className: 'kb-select', value: filters.labelSrc,
                onChange: (e) => setFilters((o) => ({ ...o, labelSrc: e.target.value })) },
                h('option', { value: '' }, t('allSrc')),
                h('option', { value: 'ai' }, t('labelSrcAi')),
                h('option', { value: 'rule' }, t('labelSrcRule'))),
              h('button', { type: 'button', className: 'kb-btn kb-btn--ai', onClick: aiClassify, disabled: aiBusy },
                aiBusy ? h('span', { className: 'kb-spin' }) : null,
                aiBusy ? t('aiLabeling')
                  : (labelStatus && !labelStatus.firstPassDone ? t('fullPass') : t('incrementalPass'))),
              h('button', { type: 'button', className: 'kb-btn kb-btn--ghost', onClick: () => setSettingsOpen(true) }, t('settings')),
              h('button', { type: 'button', className: 'kb-btn', onClick: doRebuild, disabled: rebuild.running },
                rebuild.running ? h('span', { className: 'kb-spin' }) : null,
                rebuild.running ? t('rebuilding') : t('rebuild'))),
            // ---- "don't know the name or content" hint
            h('div', { className: 'kb-hint' }, t('browseHint') + ' · ' + t('classifyHint')),
            // ---- status line
            h('div', { className: 'kb-meta' },
              h('span', { className: 'kb-tag' + (ready ? ' kb-tag--ok' : ' kb-tag--err') },
                ready ? t('statusOk') : t('statusMissing')),
              stats?.byCategory ? h('span', { className: 'kb-tag' },
                t('personal') + ' ' + fmt(stats.byCategory.personal) + ' · ' + t('dev') + ' ' + fmt(stats.byCategory.dev)) : null,
              stats?.byRoot ? h('span', { className: 'kb-tag' }, t('byRoot') + ' ' +
                Object.entries(stats.byRoot).map(([k, v]) => k + ' ' + fmt(v)).join(' · ')) : null,
              labelStatus ? h('span', {
                className: 'kb-tag' + (labelStatus.firstPassDone ? '' : ' kb-tag--warn'),
                title: t('toggleFirstPassHint') || '',
                onClick: toggleFirstPass,
                style: { cursor: 'pointer' },
              }, labelStatus.firstPassDone
                ? t('firstPassDone') + (labelStatus.pendingNew ? ' · ' + t('pendingNew').replace('{n}', fmt(labelStatus.pendingNew)) : '')
                : t('firstPassPending')) : null,
              stats?.byUseful ? h('span', { className: 'kb-tag' }, t('labelStats')
                .replace('{high}', fmt(stats.byUseful.high))
                .replace('{possible}', fmt(stats.byUseful.possible))
                .replace('{low}', fmt(stats.byUseful.low))
                .replace('{ai}', fmt(stats.aiLabels))) : null,
              rebuild.ok === false ? h('span', { className: 'kb-tag kb-tag--err' }, rebuild.error || t('rebuildFailed')) : null),
            error ? h('div', { className: 'kb-errbar' }, error) : null,
            // ---- results
            result ? h('div', { className: 'kb-meta' },
              h('span', null, result.mode === 'browse'
                ? t('browseInfo').replace('{total}', result.total).replace('{ms}', result.elapsedMs)
                : t('resultsInfo')
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
                        h('span', { className: 'kb-chip ' + (USEFUL_CLASS[r.useful] || 'kb-chip--possible') }, usefulLabel(r.useful, t)),
                        h('span', { className: 'kb-chip kb-chip--topic' }, topicLabel(r.topic, t)),
                        r.labelSrc === 'ai' ? h('span', { className: 'kb-chip kb-chip--ai' }, 'AI') : null,
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
                        h('span', { className: 'kb-chip ' + (USEFUL_CLASS[preview.useful] || 'kb-chip--possible') }, usefulLabel(preview.useful, t)),
                        h('span', { className: 'kb-chip kb-chip--topic' }, topicLabel(preview.topic, t)),
                        preview.labelSrc === 'ai' ? h('span', { className: 'kb-chip kb-chip--ai' }, 'AI') : null,
                        preview.labelWhy ? h('span', { style: { fontSize: 12, color: 'var(--kb-muted)' } }, preview.labelWhy) : null,
                        h('span', null, t('bodyChars').replace('{n}', fmt(preview.bodyChars || 0)) +
                          (preview.bodyTruncated ? ' ' + t('truncated') : ''))),
                      h('div', { className: 'kb-meta', style: { marginTop: 8 } },
                        h('button', { className: 'kb-btn kb-btn--sm', onClick: () => quickLabel('high') }, t('setHigh')),
                        h('button', { className: 'kb-btn kb-btn--sm', onClick: () => quickLabel('low') }, t('setLow'))),
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
