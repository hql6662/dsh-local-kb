# dsh-local-kb · 本地知识库

把本机 **C: / E:** 全盘文档（PDF / Markdown / TXT / Word / PPT / Excel / EPUB / MOBI / CHM / RTF / HTML / JSON / CSV / …）抽成纯文本，写入一个 SQLite **FTS5 trigram** 全文索引；以 DSH 侧栏插件提供搜索面板，并提供一个给 Agent 用的 `kb` 工具。

索引同时收录 **文件名 / 正文 / 完整路径** 三列。所以「不知道文件名、也不知道内容」时，仍能靠**目录名 / 所在位置**（如 `Desktop`、`实验三`、`wxid_gu476`）搜到，或直接进入**浏览模式**按时间线翻最近文件。

每篇文档还带两个**内容识别标签**：`useful`（有用度 high/possible/low）+ `topic`（主题 study/work/code/life/reference/other）。规则基线**零成本**给全库预打标；拿不准的由 **AI 介入复核**（面板一键唤起 DSH Agent，只按路径 + 开头片段判断、批量写回，不读整篇）。

**核心原则：省 token。** 索引与检索都在脚本 / SQLite 里完成，搜索结果只返回 **短片段（snippet）** 和元信息；Agent 默认只读片段，只有显式 `action=get` 才按需读取单篇正文（默认截断 8000 字）。任何路径都不会把整库读进模型上下文。

## 安装

插件目录：`E:\dsh files\local-kb`

```
plugin_manager  action=install_bundle  target=E:\\dsh files\local-kb
```

安装后如果侧栏没出现，硬刷新 GUI（Ctrl+Shift+R）；已加载的客户端模块有时要等 DSH 完全重启才生效。

## 索引在哪里

| 项 | 路径 |
| --- | --- |
| SQLite 索引 | `C:\Users\hql\.dsh\local-kb\kb.sqlite` |
| 配置 | `C:\Users\hql\.dsh\local-kb\config.json` |
| 构建报告 | `C:\Users\hql\.dsh\local-kb\build_report.json` |
| AI 标注库（独立） | `C:\Users\hql\.dsh\local-kb\labels.sqlite`（按**路径**存，重建索引不丢） |
| 构建脚本 | `tools/build_kb.py` |
| 查询 CLI | `tools/kb_query.py` |

索引默认已随本机全盘扫描生成（23,047 篇文档，含电子书 / 旧 Office 正文，且每篇带 `useful`/`topic` 规则标签）。可在插件面板「设置」里改扫描磁盘 / 单篇最大字数 / Python 解释器，点「重建索引」后台重扫（约 1–5 分钟，期间旧索引仍可用）。

## 侧栏面板

- 顶部：文档数 / 已索引字数 / 索引大小 / 构建时间，以及就绪状态。
- 搜索框：**文件名 / 正文 / 路径** 都可搜；中文 3 字以上走 FTS5 trigram 全文检索，短词退化为「文件名 + 开头」匹配。
- 「浏览」按钮：不输入关键词，按**修改时间倒序**列出全库文件，配合下方筛选翻找（适合「忘了叫什么、也忘了写啥」的情况）。
- 筛选：类型 / 分类（个人文档 vs 开发缓存）/ 磁盘（C: / E:）/ **路径包含**（目录名或路径片段）/ **时间范围**（7 / 30 / 365 天）/ **排序**（相关度 / 时间 / 文件名）。
- 结果卡片：文件名、路径、命中高亮片段、字数 / 大小 / 时间；点击打开右侧预览抽屉。
- 抽屉：单篇正文片段（默认 8000 字截断），可「打开文件」「在资源管理器中显示」「复制路径」。
- **内容识别筛选**：有用度 / 主题 / 来源（仅 AI 标注 / 仅规则）三个下拉，结果卡片显示双标签 chip，抽屉里可「标为高价值 / 低价值」快速订正。
- 「**AI 批量识别**」按钮：一键新建 DSH Agent 会话，让它用 `kb` 工具复核拿不准的文档并批量写标签（省 token：只回 id/路径/开头，不读整篇）。
- 「重建索引」「设置」按钮。

### 不知道文件名、也不知道写了什么时

这是索引设计里专门处理的情况，两条路都省 token（只回片段）：

1. **按「在哪里」搜**：FTS 索引含完整路径列，输入目录名 / 路径片段（`Desktop`、`实验三`、`xwechat_files`、`wxid_gu476`）即可命中，哪怕正文和文件名里都没有这个词。也可在工具栏用「路径包含」框做子串过滤。
2. **浏览时间线**：点「浏览」不输关键词，全库按**修改时间倒序**列出；再叠加「时间范围（7/30/365 天）」「类型」「路径包含」「排序」缩小范围，点击卡片预览正文判断是否是要找的那份。

CLI 等价：`kb_query.py browse --days 7 --ext docx` 或 `kb {action:"browse", days:7, ext:"docx"}`。

### 内容识别：什么有用、归哪一类

**双标签设计**（用户选定「有用度 + 主题」）：

| 维度 | 取值 | 含义 |
| --- | --- | --- |
| `useful` 有用度 | `high` | 确实有用、值得保留（个人正式文档、论文/报告、教材、手册、够长的 PDF/EPUB…） |
| | `possible` | 拿不准，等 AI 复核 |
| | `low` | 噪声 / 缓存 / 临时 / 日志 / 空文件 / 抽取失败 |
| `topic` 主题 | `study` / `work` / `code` / `life` / `reference` / `other` | 按目录名、文件名关键词 + 扩展名粗分 |

- **规则基线（零成本）**：`tools/build_kb.py` 的 `classify_labels()` 在重建时给每篇算好并写入 `docs.rule_useful / rule_topic`，不调用任何模型，全库打标。
- **AI 介入（可选、可重复）**：AI 标注存在**独立**的 `labels.sqlite`（主键是路径，重建索引 doc id 会变、路径不变，所以标注不丢）。合并视图 `vdoc` 用 `coalesce(AI, 规则)` 得出最终标签，`label_src` 标 `ai` / `rule`。
- **两档 AI 流程**（面板「AI 批量识别」按钮自动按当前档位把对应提示词交给 Agent）——首次舍得花，之后很便宜：

| 档位 | 什么时候 | 给多少 | 规则 |
| --- | --- | --- | --- |
| `full` 首次全量 | 全新索引的**第一次**识别 | 每批 50 条（上限 200），**每篇都进队**（含短文、含已 AI 标的），开头取正文前 **400 字** | **不必省 token**：看不出时允许 `kb {action:"get", id, max:3000}` 读正文再判 |
| `incremental` 增量 | 每次重建索引**之后** | 每批 30 条（上限 100），**只给还没有 AI 标注的**（即新增/变动文件），开头 200 字 | **尽量省 token**：不读正文，只看 id/路径/开头 |

  - 档位由 `labels.sqlite` 的 `state` 表决定：`first_pass_done` 未置位 → `full`，置位后 → `incremental`；`kb {action:"candidates", mode:"full"}` 可强制单次全量。
  - 首次跑完要记录一下：Agent 会调 `kb {action:"label-status", reset:false}`；面板点按钮时也会**自动写这个标记**，所以之后重建只会识别新增文件（省 token 的关键）。
  - `kb {action:"label-status"}` 返回当前档位、待复核总数、**上次重建后新增待识别数**；传 `reset:true` 可把标记清掉，下一轮重新全量。
  - 写标注统一用 `kb {action:"label", items:[{id,useful,topic,why}, ...]}`，**一次调用写整批**。

- 面板里也能对单篇快速「标为高价值 / 低价值」，或按「仅 AI 标注」筛选复核结果；状态行有一个可点击的档位标签（未完成/已完成），点一下即可切换档位。

CLI 等价：`kb_query.py candidates --limit 50`（auto 档）、`kb_query.py candidates --mode incremental`、`kb_query.py label-status`、`kb_query.py mark-first-pass [--reset]`、`kb_query.py label --items '[{"id":123,"useful":"high","topic":"study","why":"实验报告"}]'`、`kb_query.py labels`。

## Agent 工具 `kb`

| action | 用途 |
| --- | --- |
| `search`（默认） | 全文检索（文件名 + 正文 + 路径），返回片段列表。参数：`q`, `limit`, `offset`, `ext`, `category`, `root`, `path`, `days`, `sort`, `useful`, `topic`, `labelSrc` |
| `browse` | 无关键词浏览：按时间倒序列文件，可叠加 `ext/category/root/path/days/sort/limit/offset` 筛选 |
| `stats` | 索引健康：总数、按类型/分类/磁盘/状态分组、已索引字数、构建元信息 |
| `get` | 读单篇正文，参数 `id`（来自 search / browse）、`max`（默认 8000，上限 40000），明确标注是否截断 |
| `path` | 取某 id 的绝对路径 |
| `rebuild` | 后台重建索引（耗时数分钟） |
| `rebuild-status` | 查询重建进度 |
| `candidates` | AI 复核候选批。**两档**：`mode:"full"`（首次全量，每批 50/上限 200、含短文与已标、开头 400 字、**不必省 token**）或 `mode:"incremental"`（重建后增量，每批 30/上限 100、只给无 AI 标注的、开头 200 字、**省 token**）；`auto`（默认）按 `first_pass_done` 自动选。另有 `limit` / `offset` / `q2` / `minChars` / `includeAi` |
| `label` | 写 AI 标注：`items:[{id, useful, topic, why}]` 批量，或单条 `id`+`useful`+`topic`+`why`。一次标一批 |
| `labels` | 标注健康：AI 已标数 / 按来源分组 |
| `label-status` | 识别进度与档位：`firstPassDone` / `mode` / `pending`（待复核） / `pendingNew`（上次重建后新增）；`reset:true` 清档位标记 |
| `clear-labels` | 清空 AI 标注（`src` 可限定），规则基线不受影响 |

`path` 子串过滤、`days` 时间范围、`sort`（`relevance` / `mtime` / `name`）对 `search` 与 `browse` 都生效；`useful` / `topic` / `labelSrc`(`ai`|`rule`) 可叠加到任意检索，用来「只看高价值」「只看 AI 改过的」。

示例：
- `kb {action:"search", q:"HarnessMM", ext:"pdf"}` → 命中 `2610.32813v1.pdf`；再 `kb {action:"get", id:21222, max:8000}` 读开头。
- `kb {action:"browse", path:"Desktop", days:30, ext:"doc", sort:"mtime", limit:20}` → 翻「桌面里最近一个月改过的旧 Word」。
- `kb {action:"search", q:"实验三"}` → 靠**路径**里的目录名也能命中（正文未提该词时同样有效）。

## 本地 HTTP API（前缀 `/local-kb/api`）

`GET health` · `GET stats`（含 `byUseful` / `byTopic` / `byLabelSrc` / `aiLabels`）· `GET search?q=&limit=&offset=&ext=&category=&root=&path=&days=&sort=&useful=&topic=&labelSrc=` · `GET browse?...`（等价于 `search` 且 `q` 为空）· `GET doc?id=&max=` · `GET path?id=` · `GET candidates?limit=&q2=&minChars=&includeAi=&useful=&topic=` · `GET labels` · `POST labels`（body `{items:[...]}` 写入；`{clear:true, src?}` 清空）· `GET config` · `POST config` · `POST reveal` · `POST open` · `GET rebuild/status` · `POST rebuild`

仅监听本机，由 DSH 的 WebServer 前缀路由提供，不需要鉴权。

## 命令行等价操作

```bash
# 重建索引（系统 Python 需带 fitz；脚本会自动补 bundled site-packages 以拿到 pptx/openpyxl）
# 电子书 / 旧 Office 抽取器（mobi/striprtf/olefile）已 vendor 进 tools/vendor/，无需 pip
PYTHONUTF8=1 C:/Python314/python.exe tools/build_kb.py --roots "C:/,E:/" \
  --db "C:/Users/hql/.dsh/local-kb/kb.sqlite"

# 查询
PYTHONUTF8=1 python tools/kb_query.py stats
PYTHONUTF8=1 python tools/kb_query.py search --q "知识库" --limit 20
PYTHONUTF8=1 python tools/kb_query.py search --q "实验三"            # 命中路径里的目录名
PYTHONUTF8=1 python tools/kb_query.py browse --path Desktop --days 30 --ext doc --sort mtime --limit 20
PYTHONUTF8=1 python tools/kb_query.py get --id 21222 --max 8000

# 内容识别（规则标签随索引生成；AI 标注独立存 labels.sqlite）
PYTHONUTF8=1 python tools/kb_query.py stats                        # by_useful / by_topic / by_label_src
PYTHONUTF8=1 python tools/kb_query.py search --q 论文 --useful high --topic study
PYTHONUTF8=1 python tools/kb_query.py candidates --limit 30 --q2 实验三
PYTHONUTF8=1 python tools/kb_query.py label --items '[{"id":123,"useful":"high","topic":"study","why":"实验报告"}]'
PYTHONUTF8=1 python tools/kb_query.py labels
```

## 覆盖的格式与抽取方式

| 格式 | 抽取 |
| --- | --- |
| `.md .txt .rst .json .yaml .yml .csv .tsv .log` | 纯文本（UTF-8，errors=replace） |
| `.html .htm` | 去 script/style/标签 + HTML 实体反转义 |
| `.pdf` | PyMuPDF 逐页取文本（note 记页数） |
| `.docx .docm .dotx .dotm` | Word：段落 + 表格；模板/宏变体走通用 OOXML zip 抽 XML 文本 |
| `.pptx .pptm .ppsx .ppsm .potx .potm` | PowerPoint：幻灯片形状 + 表格；变体走通用 OOXML zip |
| `.xlsx .xlsm .xlsb .xltx .xltm` | Excel：openpyxl read_only / data_only；变体走通用 OOXML zip |
| `.epub` | zip 内 xhtml/html |
| `.mobi .azw .azw3 .azw4 .prc .kf8` | 内置 `mobi` 解包 → 转成 EPUB → 抽正文（已 vendor 进 `tools/vendor/`） |
| `.chm` | `hh.exe -decompile` → GB18030 解码 HTML → 去标签 |
| `.rtf` | `striprtf`（vendor）/ pandoc `-f rtf -t plain` 兜底 |
| `.odt .odp .ods .odg .ott .otp .ots` | ODF：content.xml / styles.xml / meta.xml |
| `.fb2` | FictionBook：整本 XML 去标签 |
| `.tex .latex` | 纯文本 |
| `.doc .ppt .xls`（旧二进制 OLE2） | **MS Office COM 批量抽取**（一次进程、一个实例循环全部文件），55 篇 Word / 2 篇 PPT 取到正文；按 OLE2 魔数守卫，跳过 Lucene 索引等伪 `.doc` |

单篇默认截断 30000 字，单文件上限 40 MB；过大的文件 status=`skipped`；抽取器不可用退化为 `name-only`（仅文件名，不读正文，保住省 token 约束）。磁盘上另有 `.pdb/.key/.pot/.dot` 是调试符号 / 密钥 / gettext / graphviz，非文档，故意不索引。

## 状态说明

`ok`（成功抽取正文，22,895 篇）· `empty`（109 篇无正文，多为模板/空文件）· `name-only`（2 篇抽取器不可用，仅文件名）· `skipped`（28 篇过大）· `failed`（13 篇抽取报错，多为重建时正被写入的文件）。旧版 `.doc/.ppt` 已由 MS Office COM 抽到正文，`name-only` 从此前的 61 篇降到 4 篇。

## 数据说明

全盘含缓存（用户选择「全盘 C:+E:」），其中包含 `.workbuddy`、`.dsh`、`AppData`、`.pi` 等开发目录里的 `.md/.json/.log`，所以文档数偏大。分类 `personal` / `dev` 仅按路径关键词粗分；若要排除缓存，在「设置」里把扫描根目录收敛到 `E:/MyFiles,C:/Users/hql/Desktop,C:/Users/hql/Documents` 后重建。

## 依赖

- 运行时：DSH 自带 Node ≥ 22（`node:sqlite` 内置，`DatabaseSync` 只读打开索引）。
- 重建索引：系统 Python 3.14（`C:/Python314/python.exe`，含 PyMuPDF / python-docx / lxml / Pillow），脚本自动把 DSH bundled `Lib/site-packages` 追加到 `sys.path` 以补 `python-pptx` / `openpyxl`。
- 电子书 / 旧 Office：`tools/vendor/` 内置 `mobi`、`striprtf`、`olefile`（及 loguru/colorama 依赖），离线可用；`.chm` 用系统 `hh.exe`，`.rtf`/`.odt` 可用本机 pandoc 兜底；`.doc/.ppt/.xls` 用已安装的 MS Office COM（无 Office 时自动退化为 `name-only`）。

## 许可

MIT
