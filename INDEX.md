# 本地知识库 · 索引总览（INDEX）

> 本文件由 `kb.sqlite` 的真实统计生成，作为「把本机文档整合成一个本地知识库」的成果清单。
> 它本身也是库中的一篇文档（`E:\dsh files\local-kb\INDEX.md`）。

**生成时间**：2026-11-07 22:32  ·  **索引构建于**：2026-11-07 22:18:59  ·  **版本**：1

## 一句话

全盘 C: + E: 共索引 **24,023 篇文档**、**171,134,977 字**正文，落进一个 0.67 GB 的 SQLite FTS5 trigram 全文索引；通过 DSH 侧栏「本地知识库」面板或 `kb` 工具检索，**只返回片段，不把整库读进上下文**（省 token）。

## 规模

| 指标 | 数值 |
| --- | --- |
| 文档总数 | 24,023 |
| 已索引正文字数 | 171,134,977 |
| 索引文件大小 | 0.67 GB |
| 扫描根目录 | C:/,E:/ |
| 构建耗时 | 扫描 4.3s + 抽取 246.4s + 建索引 26.7s = 277.5s |
| 单篇截断 | 30000 字 / 单文件上限 40 MB |

## 按格式

| 扩展名 | 篇数 | 说明 |
| --- | --- | --- |
| `.md` | 12,133 | Markdown |
| `.json` | 5,216 | 配置/会话数据 |
| `.txt` | 3,005 | 纯文本 |
| `.html` | 1,671 | 网页 |
| `.log` | 1,228 | 日志 |
| `.yaml` | 186 | YAML |
| `.csv` | 125 | 表格 |
| `.pdf` | 117 | PDF（逐页取文本） |
| `.docx` | 95 | Word |
| `.yml` | 73 | YAML |
| `.doc` | 59 | 旧版 Word（仅文件名） |
| `.pptx` | 40 | PowerPoint |
| `.htm` | 24 | 网页 |
| `.epub` | 19 | 电子书 |
| `.rst` | 13 | reStructuredText |
| `.tsv` | 9 | 表格 |
| `.xlsx` | 6 | Excel |
| `.ppt` | 2 | 旧版 PPT（仅文件名） |
| `.markdown` | 2 | Markdown |

## 按分类 / 磁盘 / 抽取状态

- **分类**：个人文档 personal `18,548` · 开发/缓存 dev `5,475`（按路径关键词粗分）
- **磁盘**：`C::` 20,877 · `E::` 3,146（root 值带双冒号是构建脚本的写法）
- **抽取状态**：`empty` 116 · `failed` 22 · `name-only` 61 · `ok` 23,775 · `skipped` 49

## 文档最集中的目录（前 16）

| 目录 | 篇数 |
| --- | --- |
| `C:/Users/hql` | 20,108 |
| `E:/MyFiles/01-Work` | 916 |
| `E:/workbuddy/resources` | 583 |
| `C:/Python314/Doc` | 572 |
| `E:/Users/Documents` | 481 |
| `E:/Users/hql` | 407 |
| `E:/Users/Desktop` | 184 |
| `C:/Python314/Lib` | 119 |
| `E:/MyFiles/02-Study` | 91 |
| `E:/pi history/01-会话记录` | 82 |
| `E:/pi history/02-产出文件` | 67 |
| `C:/Android/sdk` | 64 |
| `E:/MyFiles/date` | 51 |
| `E:/dsh files/session-backup-2026-11-04` | 45 |
| `E:/game/Wuthering Waves` | 43 |
| `E:/MyFiles/03-SoftwareInstallers` | 29 |

> 因用户选择「全盘（含缓存）」，`.workbuddy` / `.dsh` / `AppData` / `.pi` / `.vscode` 等开发目录里的 `.md/.json/.log` 也计入，所以 C: 与 personal 占比很高。若只要个人文档，把扫描根目录收敛到 `E:/MyFiles`、`C:/Users/hql/Desktop`、`C:/Users/hql/Documents` 等后重建。

## 怎么用这个知识库

1. **侧栏面板**：DSH 左侧「本地知识库」→ 搜索框输入（中文 ≥3 字走全文索引）→ 看命中高亮片段 → 点结果打开正文预览抽屉 → 可打开/定位/复制路径。可用类型/分类/磁盘筛选。
2. **Agent 工具 `kb`**：`action=search` 拿片段列表，`action=get` 按需读单篇（默认截断 8000 字），`action=stats` 看健康，`action=rebuild` 后台重扫。
3. **命令行**：`python tools/kb_query.py search --q "关键词"`，或 `python tools/kb_query.py get --id N`。
4. **HTTP API**：`/local-kb/api/search?q=…` 等（见 README.md）。

## 典型命中示例（已实测）

- `知识库` → 325 篇（kwiki.md、workflow.md、wiki.md …）
- `HarnessMM` → 9 篇，含 `E:/dsh files/2610.32813v1.pdf`（PDF 正文已抽取，片段 `…HarnessMM: Recursive Self-Improvement…`）
- `观后感` → 命中本地会话记录与 knowledge.md
- `ok` / `%` 短词 → 自动退化为「文件名 + 开头」匹配

## 设计取舍

- **trigram tokenizer**：中文无需分词即可做子串匹配；代价是 `MATCH` 必须传带引号的短语，短于 3 字退化为 LIKE。
- **external-content FTS5**：正文只存一份在 `docs` 表，`fts` 表只存索引，避免翻倍占用。
- **每次查询开只读句柄**：重建索引时可原子替换文件，不会锁住旧库；旧索引在重建失败时仍可用。
- **旧二进制格式（.doc/.ppt/.xls）**：本机无 antiword/catdoc/soffice，退化为仅文件名（61 篇），status=`name-only`。
- **省 token**：所有检索/抽取在脚本与 SQLite 内完成，模型只接触片段；这是本项目贯穿始终的硬约束。
