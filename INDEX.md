# 本地知识库 · 索引总览（INDEX）

> 本文件由 `kb.sqlite` 的真实统计生成，作为「把本机文档整合成一个本地知识库」的成果清单。
> 它本身也是库中的一篇文档（`E:\dsh files\local-kb\INDEX.md`）。

**生成时间**：2026-11-09 18:16  ·  **索引构建于**：2026-11-09 15:25:53  ·  **索引版本**：3（三列全文索引 + 内容识别双标签）

## 一句话

全盘 C: + E: 共索引 **23,047 篇文档**、**154,330,686 字**正文，落进一个 0.64 GB 的 SQLite FTS5 trigram 全文索引；**文件名 / 正文 / 完整路径**三列都可搜，还能无关键词按时间线浏览；每篇另带 `useful`（有用度）+ `topic`（主题）双标签，规则预打标 + AI 介入复核。通过 DSH 侧栏「本地知识库」面板或 `kb` 工具检索，**只返回片段，不把整库读进上下文**（省 token）。

## 规模

| 指标 | 数值 |
| --- | --- |
| 文档总数 | 23,047 |
| 已索引正文字数 | 154,330,686 |
| 索引文件大小 | 0.64 GB |
| 扫描根目录 | C:/,E:/ |
| 构建耗时 | 扫描 3.3s + 抽取 374.8s + 建索引 25.0s = 403.2s |
| 单篇截断 | 30,000 字 / 单文件上限 40 MB |

## 按格式

| 扩展名 | 篇数 | 说明 |
| --- | --- | --- |
| `.md` | 12,050 | Markdown |
| `.json` | 4,763 | 配置/会话数据 |
| `.txt` | 2,931 | 纯文本 |
| `.html` | 1,479 | 网页 |
| `.log` | 1,036 | 日志 |
| `.yaml` | 185 | YAML |
| `.csv` | 123 | 表格 |
| `.docx` | 98 | Word |
| `.pdf` | 91 | PDF（逐页取文本） |
| `.yml` | 69 | YAML |
| `.doc` | 59 | 旧版 Word（COM 抽取） |
| `.pptx` | 40 | PowerPoint |
| `.tex` | 30 | LaTeX |
| `.epub` | 19 | 电子书 EPUB |
| `.htm` | 18 | 网页 |
| `.rtf` | 15 | 富文本（striprtf/pandoc） |
| `.rst` | 14 | reStructuredText |
| `.tsv` | 9 | 表格 |
| `.xlsx` | 6 | Excel |
| `.chm` | 3 | CHM 帮助（反编译+GB18030） |
| `.ppt` | 2 | 旧版 PPT（COM 抽取） |
| `.markdown` | 2 | Markdown |
| `.dotx` | 2 | Word 模板 |
| `.dotm` | 2 | Word 模板 |
| `.mobi` | 1 | Kindle 电子书（解包转 EPUB） |

## 按分类 / 磁盘 / 抽取状态

- **分类**：开发/缓存 dev `5,017` · 个人文档 personal `18,030`
- **磁盘**：`C::` 19,869 · `E::` 3,178（root 值带双冒号是构建脚本的写法）
- **抽取状态**：`empty` 109 · `failed` 13 · `name-only` 2 · `ok` 22,895 · `skipped` 28

## 内容识别：有用度 / 主题（规则基线 + AI 覆盖）

| 维度 | 分布 |
| --- | --- |
| `useful` 有用度 | `high` 682 · `low` 21,944 · `possible` 421 |
| `topic` 主题 | `code` 3,004 · `life` 51 · `other` 6,382 · `reference` 13,302 · `study` 308 |
| AI 已介入标注 | 24,331 篇（独立 `labels.sqlite`，按路径存，重建不丢） |

> 规则基线零成本给全库打标；`possible`（拿不准）的由「AI 批量识别」按钮唤起 DSH Agent，按 id/路径/开头片段判断并一次写一批，规则用 `coalesce(AI, 规则)` 覆盖。

### AI 识别是两档的

| 档位 | 何时 | 给 Agent 什么 | 省 token？ |
| --- | --- | --- | --- |
| `full` 首次全量 | 全新索引的第一次识别 | 每批 50 条，每篇都进队（含短文/已标），开头 400 字 | **不必省**，看不出可读正文 |
| `incremental` 增量 | 每次重建索引之后 | 每批 30 条，只给还没有 AI 标注的新文件，开头 200 字 | **尽量省**，不读正文 |

> 档位由 `labels.sqlite` 的 `state.first_pass_done` 决定；首次跑完写一次标记（面板按钮会自动写），之后每次重建只识别新增文件。`kb {action:"label-status"}` 可查进度，`reset:true` 可回到全量。

## 文档最集中的目录（前 16）

| 目录 | 篇数 |
| --- | --- |
| `C:/Users/hql/tools/go/src/cmd/go/testdata/script` | 931 |
| `C:/Users/hql/.local/share/billion-context/sessions/anthropic` | 357 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/workbuddy-connector-plugins-official/connectors/thinkingai-agentic-engine/skills/ae-cli/references/domains/ae-analysis/references` | 349 |
| `C:/Python314/Doc/html/library` | 328 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/workbuddy-connector-plugins-official/connectors/kdocs/skills/kdocs/references/wps` | 300 |
| `C:/Users/hql/tools/go/src/cmd/go/testdata/mod` | 269 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/all-commands/commands` | 175 |
| `C:/Users/hql/.workbuddy/plugins/cache/workbuddy-wecom-unified/wecom-unified/1.1.9/skills/wecom-unified/references` | 131 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/workbuddy-wecom-unified/plugin/skills/wecom-unified/references` | 131 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/plugins/tmap-lbs-plugin/skills/tmap-jsapi-gl/references/jsapigl/demos` | 129 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/codebuddy-plugins-official/external_plugins/all-agents/agents` | 117 |
| `C:/Users/hql/AppData/Local/Microsoft/Edge/User Data/Default/Extensions/capohkkfagimodmlpnahjoijgoocdjhd/1.38.0_0/static/js/async` | 105 |
| `C:/Users/hql/.vscode/extensions/ms-ceintl.vscode-language-pack-zh-hans-1.131.2026090407/translations/extensions` | 94 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/workbuddy-connector-plugins-official/connectors/workrally1/skills/asset-style-selector/references/library/styles` | 87 |
| `C:/Users/hql/AppData/Roaming/Oray/AweSun/log` | 85 |
| `C:/Users/hql/.workbuddy/plugins/marketplaces/workbuddy-connector-plugins-official/connectors/thinkingai-agentic-engine/skills/ae-cli/references/domains/ae-engage/references` | 81 |

> 因用户选择「全盘（含缓存）」，`.workbuddy` / `.dsh` / `AppData` / `.pi` / `.vscode` 等开发目录里的 `.md/.json/.log` 也计入，所以 C: 与 personal 占比很高。若只要个人文档，把扫描根目录收敛到 `E:/MyFiles`、`C:/Users/hql/Desktop`、`C:/Users/hql/Documents` 等后重建。

## 怎么用这个知识库

1. **侧栏面板**：DSH 左侧「本地知识库」→ 搜索框输入（中文 ≥3 字走全文索引）→ 看命中高亮片段 → 点结果打开正文预览抽屉 → 可打开/定位/复制路径。可用类型/分类/磁盘/路径包含/时间范围/排序筛选。
2. **不知道文件名、也不知道内容**：FTS 含**完整路径**列，直接搜目录名 / 所在位置（`Desktop`、`实验三`、`xwechat_files`）；或点「**浏览**」按修改时间倒序翻全库，叠加「时间范围 / 类型 / 路径包含」缩小范围。
3. **内容识别**：面板用「有用度 / 主题 / 来源」筛选，只看高价值；点「**AI 批量识别**」一键让 DSH Agent 复核拿不准的文档（`candidates` → `label` 批量写回，只回片段）；单篇可在抽屉里「标为高价值 / 低价值」。
4. **Agent 工具 `kb`**：`action=search` 拿片段列表，`action=browse` 无关键词时间线，`action=candidates/label/labels/label-status` 做 AI 标注，`action=get` 按需读单篇（默认截断 8000 字），`action=stats` 看健康，`action=rebuild` 后台重扫。
5. **命令行**：`python tools/kb_query.py search --q "关键词" --useful high`，`python tools/kb_query.py candidates --mode incremental`，`python tools/kb_query.py label --items ...`。
6. **HTTP API**：`/local-kb/api/search?q=…`、`/local-kb/api/browse?days=30&ext=doc`、`/local-kb/api/candidates?q2=…`、`/local-kb/api/labels/status` 等（见 README.md）。

## 典型命中示例（已实测）

- `知识库` → 0 篇（kwiki.md、workflow.md、wiki.md …）
- `HarnessMM` → 0 篇，含 `E:/dsh files/2610.32813v1.pdf`（PDF 正文已抽取）
- `华三云实验室` → 0 篇（CHM 帮助正文已抽取、GB18030 解码）
- `实验报告` → 0 篇（旧版 `.doc` 经 MS Office COM 抽取到正文，多为 `high/study`）
- `版权信息` → 0 篇（`.mobi` 电子书解包转 EPUB 后抽正文）
- `GENERAL PUBLIC` → 0 篇（`.rtf` 经 striprtf 抽取）
- `实验三` / `Desktop` / `xwechat_files` → 靠**路径列**命中（正文与文件名不含该词时同样有效，这是「忘了名字和内容」的主要解法）
- `ok` / `%` 短词 → 自动退化为「文件名 + 开头」匹配

## 设计取舍

- **trigram tokenizer**：中文无需分词即可做子串匹配；代价是 `MATCH` 必须传带引号的短语，短于 3 字退化为 LIKE。索引 3 列 `name, body, path`；`snippet(fts,1,…)` 仍只取正文列，`bm25` 对多余列给默认权重 1.0。
- **路径进索引 + 浏览模式**：解决「不知道文件名、也不知道内容」——路径列让目录名/所在位置可搜，空关键词走 `browse`（`WHERE 1=1` + 时间倒序 + 筛选），不触碰 FTS；`path` 子串 / `days` 时间范围 / `sort` 对两种模式都生效。
- **内容识别双标签 + AI 介入**：`useful`(high/possible/low) × `topic`(study/work/code/life/reference/other) 由规则零成本预打标写入 `docs.rule_*`；AI 标注独立存 `labels.sqlite`（主键=路径，doc id 变了也不丢），合并视图 `vdoc = docs LEFT JOIN labels` 用 `coalesce(AI, 规则)` 出最终标签。AI 只拿 `candidates`（id/路径/开头 200 字）判断，绝不读整篇。
- **external-content FTS5**：正文只存一份在 `docs` 表，`fts` 表只存索引，避免翻倍占用。
- **每次查询开只读句柄**：重建索引时可原子替换文件，不会锁住旧库；旧索引在重建失败时仍可用。
- **电子书与旧 Office**：`mobi`/`striprtf`/`olefile` 已 vendor 进 `tools/vendor/` 离线可用；`.chm` 用系统 `hh.exe`，`.rtf`/`.odt` 用 pandoc 兜底；`.doc/.ppt/.xls` 用 MS Office COM 一次进程批量抽取（OLE2 魔数守卫，跳过 Lucene 伪文件）。抽取器不可用一律退化为 `name-only`。
- **省 token**：所有检索/抽取/标注在脚本与 SQLite 内完成，模型只接触片段；这是本项目贯穿始终的硬约束。
