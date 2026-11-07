# dsh-local-kb · 本地知识库

把本机 **C: / E:** 全盘文档（PDF / Markdown / TXT / DOCX / PPTX / XLSX / EPUB / HTML / JSON / CSV / …）抽成纯文本，写入一个 SQLite **FTS5 trigram** 全文索引；以 DSH 侧栏插件提供搜索面板，并提供一个给 Agent 用的 `kb` 工具。

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
| 构建脚本 | `tools/build_kb.py` |
| 查询 CLI | `tools/kb_query.py` |

索引默认已随本机全盘扫描生成（24,023 篇文档）。可在插件面板「设置」里改扫描磁盘 / 单篇最大字数 / Python 解释器，点「重建索引」后台重扫（约 5 分钟，期间旧索引仍可用）。

## 侧栏面板

- 顶部：文档数 / 已索引字数 / 索引大小 / 构建时间，以及就绪状态。
- 搜索框：中文 3 字以上走 FTS5 trigram 全文检索，短词退化为「文件名 + 开头」匹配。
- 筛选：类型 / 分类（个人文档 vs 开发缓存）/ 磁盘（C: / E:）。
- 结果卡片：文件名、路径、命中高亮片段、字数 / 大小 / 时间；点击打开右侧预览抽屉。
- 抽屉：单篇正文片段（默认 8000 字截断），可「打开文件」「在资源管理器中显示」「复制路径」。
- 「重建索引」「设置」按钮。

## Agent 工具 `kb`

| action | 用途 |
| --- | --- |
| `search`（默认） | 全文检索，返回片段列表。参数：`q`, `limit`, `offset`, `ext`, `category`, `root` |
| `stats` | 索引健康：总数、按类型/分类/磁盘/状态分组、已索引字数、构建元信息 |
| `get` | 读单篇正文，参数 `id`（来自 search）、`max`（默认 8000，上限 40000），明确标注是否截断 |
| `path` | 取某 id 的绝对路径 |
| `rebuild` | 后台重建索引（耗时数分钟） |
| `rebuild-status` | 查询重建进度 |

示例：`kb {action:"search", q:"HarnessMM", ext:"pdf"}` → 命中 `2610.32813v1.pdf`；再 `kb {action:"get", id:20909, max:8000}` 读开头。

## 本地 HTTP API（前缀 `/local-kb/api`）

`GET health` · `GET stats` · `GET search?q=&limit=&offset=&ext=&category=&root=` · `GET doc?id=&max=` · `GET path?id=` · `GET config` · `POST config` · `POST reveal` · `POST open` · `GET rebuild/status` · `POST rebuild`

仅监听本机，由 DSH 的 WebServer 前缀路由提供，不需要鉴权。

## 命令行等价操作

```bash
# 重建索引（系统 Python 需带 fitz；脚本会自动补 bundled site-packages 以拿到 pptx/openpyxl）
PYTHONUTF8=1 C:/Python314/python.exe tools/build_kb.py --roots "C:/,E:/" \
  --db "C:/Users/hql/.dsh/local-kb/kb.sqlite"

# 查询
PYTHONUTF8=1 python tools/kb_query.py stats
PYTHONUTF8=1 python tools/kb_query.py search --q "知识库" --limit 20
PYTHONUTF8=1 python tools/kb_query.py get --id 20909 --max 8000
```

## 覆盖的格式与抽取方式

| 格式 | 抽取 |
| --- | --- |
| `.md .txt .rst .json .yaml .yml .csv .tsv .log` | 纯文本（UTF-8，errors=replace） |
| `.html .htm` | 去 script/style/标签 + HTML 实体反转义 |
| `.pdf` | PyMuPDF 逐页取文本（note 记页数） |
| `.docx` | 段落 + 表格 |
| `.pptx` | 幻灯片形状 + 表格 |
| `.xlsx` | openpyxl read_only / data_only |
| `.epub` | zip 内 xhtml/html |
| `.doc .ppt .xls`（旧二进制） | 本机无 antiword/catdoc/soffice → **仅文件名**，status=`name-only`（61 篇） |

单篇默认截断 30000 字，单文件上限 40 MB；过大的文件 status=`skipped`。

## 状态说明

`ok`（成功抽取正文，23,775 篇）· `empty`（116 篇无正文）· `name-only`（61 篇旧格式）· `skipped`（49 篇过大）· `failed`（22 篇抽取报错，多为重建时正被写入的文件）。

## 数据说明

全盘含缓存（用户选择「全盘 C:+E:」），其中包含 `.workbuddy`、`.dsh`、`AppData`、`.pi` 等开发目录里的 `.md/.json/.log`，所以文档数偏大。分类 `personal` / `dev` 仅按路径关键词粗分；若要排除缓存，在「设置」里把扫描根目录收敛到 `E:/MyFiles,C:/Users/hql/Desktop,C:/Users/hql/Documents` 后重建。

## 依赖

- 运行时：DSH 自带 Node ≥ 22（`node:sqlite` 内置，`DatabaseSync` 只读打开索引）。
- 重建索引：系统 Python 3.14（`C:/Python314/python.exe`，含 PyMuPDF / python-docx / lxml / Pillow），脚本自动把 DSH bundled `Lib/site-packages` 追加到 `sys.path` 以补 `python-pptx` / `openpyxl`。

## 许可

MIT
