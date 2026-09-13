# Opsy 核心目的深度审计

> 本文保留 04:52 的修复前基线。用户随后授权修复；最新逐项状态、125 项测试与剩余实店验收见[修复验收与交接](../handoffs/2026-09-13-opsy-core-repair-handoff.md)。下文缺陷描述不代表修复后的当前状态。

**结论：Opsy 已有可用的独立 Skill 基础，但尚不能认定为“客户只装 Opsy，就能稳定完成三项工作、准确汇报并可靠交接”的完整交付版本。** 产品和 Blog 的内容准备较完整；主要缺口在字段实际写入、数据结论正确性、统一结果产物和跨会话恢复。

修复顺序与验收用例见[修复 handoff](../handoffs/2026-09-13-opsy-core-audit-handoff.md)。本轮只新增审计文档，未修改 Opsy 功能。

## 审计口径

- 日期：2026-09-13；时区：Asia/Shanghai；基线采集：04:52。
- 目标：`skills/opsy/` 的当前工作区版本，共 75 个文件；包括审计开始前已有的未提交改动。不是仅审计 Git HEAD。
- HEAD：`f6c3282693d370eb88be17c1a3f54423405c1e4e`；包版本：`0.1.0`。
- 需求依据：[项目核心目的](../opsy-core-purpose.md)，包括最低资料创建产品草稿、服务方交付询盘分析报表等当前表述。
- 实现依据：Skill 入口、全部内部模块导入、相关工作流与契约、GraphQL 模板、工作区模板、CLI 分支和仓库测试。
- 实证：106 项仓库测试；包校验；双宿主安装预演；7 项定向本地检查。定向检查只使用合成数据，不读取客户经营资料。
- 平台依据：本次访问的 Shopify 官方文档；相关页面显示当前版本为 `2026-07 latest`。没有验证真实店铺权限、主题、媒体处理或线上发布。
- 原始证据保存在仓库外：`D:/Opsy-audit-evidence/2026-09-13-045217/`。包括静态审计 JSON、测试输出、合成数据、`probes.mjs`、`probes.json` 和前后指纹。
- `skills/opsy/` 审计前后 SHA-256 清单一致。审计器实际路径由报告 provenance 记录为本机 `skill-skill` 项目中的脚本。

本报告的“独立”指客户只安装 Opsy Skill。宿主 Agent 的文件、浏览器和图片读取能力，以及 Node、Shopify CLI 与已授权店铺属于运行条件；我们交付的数据包属于业务输入。它们不等同于另一个 Skill。

## 核心能力判定

| 目标 | 当前证据 | 判定 |
| --- | --- | --- |
| 产品资料整理与文案 | 内置 CSV/XLSX/图片导入、逐项确认、资料绑定、买家决策与内容校验 | 基础可用；多变体明确不在当前支持范围。 |
| 产品完整上架 | 有草稿、激活、渠道发布和回读模板 | 部分完成；SKU/价格与本地图片的写入环节不完整，见 F02、F03。 |
| Blog 内容与发布 | 有数据/FAQ 选题、画像、正文、媒体关联、本地预览和发布路径 | 部分完成；SEO 字段落地和若干指令冲突待修复，见 F04、F05。 |
| 运营与线索分析 | 可读取本地 GSC/GA4 和 `inquiry_*` 数据，生成摘要及有界历史比较 | 基础可用，但不能直接把摘要当可靠结论；见 F07—F09。 |
| SEO/GEO 方法支持 | 有真实需求、单页主题落点、受众、FAQ、事实证据和询盘入口规则 | 有方法支持；不等于搜索排名或 AI 引用效果已验证。 |
| 选题评估 | 基于数据或 FAQ 的候选队列、用途分流和客户确认 | 可以独立完成当前承诺；无独立 KD/机会值数值打分器。 |
| 清楚汇报结果 | 有分对象成败原则、日志表、产品补充项和月度摘要 | 不够统一；没有覆盖三个核心流程的结果合同，见 F01。 |
| handoff 与恢复 | 有服务方向客户导入任务的 CSV 合同 | 仅入站交接较明确；执行回执、会话恢复和重复导入保护不完整，见 F01、F11。 |

“Agent 可以临时查文档补代码”不等于 Skill 已内置稳定流程；但缺少自动化脚本，也不能单独证明 Agent 完全不能完成任务。以下区分已复现缺陷、已确认的合同缺口和仍需真实运行验证的事项。

## 确定性检查结果

此部分完全保留 `skill-self-check` 脚本结论，不与下文的业务审阅优先级混合。

| 检查 | 结果 |
| --- | --- |
| `package_health` | `valid_skill_package`；唯一 Skill 根、路径与引用等检查通过。 |
| `gate_verdict` | **`fail`**。 |
| `gate_reasons` | `description_voice_and_triggers` 未通过；存在 Critical `1.7`。 |
| Critical | 1 项：`1.7`，description 未被识别为 WHEN 触发语。 |
| Should fix | 1 项：`2.5`，否定指令密度较高，脚本检测到 8 次。 |
| Workflow Prompt | `not_applicable`，单 Agent 上下文，无独立模型调用流程。 |
| Role contract | `not_applicable`，同一上下文依靠现有流程与审批规则。 |
| 信息性分数 | 基础可用 4/5、契约清晰 5/5、配套 3/3；不改变 fail。 |
| Token | `estimated`：入口约 3,814 tokens，按 UTF-8 字节数/4 估算，低置信度；不代表完整运行消耗。 |
| 目标运行时长 | `not_measured`；未进行真实客户任务端到端运行。 |

Critical `1.7` 的实际内容是入口已经写了 `Use for ...`，审计器的触发正则识别 `Use when ...`，不识别该表达。**这是审计器兼容性问题的证据，不证明入口毫无触发场景；脚本 fail 仍照实保留。**

可直接采用的 description 改法，保留现有业务范围：

```yaml
description: Guides enterprise owners, sales, and basic operators through B2B inquiry-focused Shopify work. Use when the user requests Opsy workspace setup, business profiling, three weekly actions, product listing, Blog publishing, provider-delivered local data analysis, redirects, existing metafield values, or explicitly approved Shopify operations. Excludes checkout-led DTC, live Google access, and technical site-foundation audits.
```

对 `2.5`，建议将重复禁令集中到运行边界，并在工作流写清正向替代。例如：“Product starts from confirmed merchant materials; Blog uses validated delivered data or accepted FAQ seeds.” 审批、凭证和事实边界仍须保留。

常规工程检查全部通过：`npm test` 106/106、`npm run validate`、UTF-8 模式的 `quick_validate.py`、PowerShell/Bash 安装器对 Codex 与 WorkBuddy 的 dry-run，以及 `git diff --check`。这些检查与上述静态 gate 使用不同规则，结论不矛盾。

未运行独立 `skill-ship-safety` 检查器：其流程要求结构 gate 先通过。本轮已手工核对写入合同并只读访问官方 API 文档；真实外部执行仍为 **execution unverified**，也没有可信隔离环境中的外部写入绕过测试。

## 业务与实现发现

以下所有 F 项均为 `source: model_review`，属于模型工程审阅，不增加或更改脚本 Critical 数量。优先级 high 表示影响核心交付或结果可信度，medium 表示影响一致性和复用。所有行号对应本次基线。

### F01 — 缺少统一结果合同与出站 handoff

- **优先级：high；类别：合同/交付；置信度：高；状态：静态已确认。**
- 范围：三项核心任务的收尾、下次会话恢复、服务方收取结果。
- 证据：`references/agency-handoff.md:3-6,49-65` 只定义任务导入及待选状态；`assets/workspace/ai-log/operations-log.md:5-6` 只有通用日志列；`references/runtime-contract.md:17-26` 的启动顺序没有读取未完成任务或恢复记录；`scripts/opsy.mjs:143-173` 没有结果收尾或恢复命令。
- 已有的内容包、三项行动包和日志可作为交接材料，但没有强制串起：任务 ID、输入版本、执行阶段、对象 ID、草稿/发布 URL、字段写入结果、未完成项、下一动作、再次执行前核验条件。
- 影响：新会话可能只看到“草稿包存在”，不知道 Shopify 是否已创建；服务方也无法稳定区分已发布、只完成本地内容、部分写入及待回读。缺少合同不等于必然重复创建，但无法可靠防止。
- 建议：在现有 `outputs/` 中保存统一 `result.json`、客户 `report.md`、`handoff.md`，按任务读取恢复信息；不新增长期客户配置或另一个 Skill。具体建议字段见 handoff。

### F02 — 商品包中的 SKU/价格没有完整写入路径

- **优先级：high；类别：实现/操作合同；置信度：高；状态：代码与官方字段已确认，线上影响待实测。**
- 范围：包含已确认 SKU、价格的单变体产品。
- 证据：`references/product-package-contract.md:16` 将 `variant` 纳入包，`scripts/lib/merchant-packages.mjs:359` 要求 SKU；实际模板为 `assets/graphql/product-create-draft.graphql` 与 `product-update.graphql`，`scripts/lib/guard.mjs:24-149` 无变体更新操作。
- 官方 `ProductCreateInput` 包含产品级字段，没有直接设置变体 SKU/价格的字段；产品创建与变体管理属于不同操作。[官方 ProductCreateInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductCreateInput)、[官方 productCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productcreate)。
- 影响：包校验通过不能证明 SKU/价格已保存到店铺。按现成流程执行，Agent 需要自行补出未登记的操作，或留下字段未完成。
- 建议：补齐单变体字段映射、受控操作、响应合同与回读差异；不扩大为多变体或库存补货功能。必需字段未落地时只报部分完成。

### F03 — 本地图片入库后，缺少上传到 Shopify 的闭环

- **优先级：high；类别：实现/运行能力；置信度：高；状态：静态与平台输入要求已确认。**
- 范围：客户上传本地产品图片或 Blog 配图，没有可用远程资源地址。
- 证据：`references/workflow-products.md:20-48` 与 `scripts/lib/merchant-packages.mjs:448-457` 接受本地路径；GraphQL 模板与 guard 未包含 staged upload/file upload 的操作路径；Blog write 模式在 `merchant-packages.mjs:948-953` 要求 HTTPS 图片。
- 官方 `CreateMediaInput.originalSource` 接受外部或 staged upload URL，本地文件路径并不直接成为 Shopify 可访问资源。[官方 CreateMediaInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/CreateMediaInput)。
- 影响：资料导入成功后仍可能无法带图创建商品，或 Blog 停在 `needs_media`。现有“媒体回读”只能核验已提交资源，不能替代上传。
- 建议：内置有明确批准范围的上传、处理状态查询、资源绑定和失败恢复流程；或明确让客户提供已上传的店铺资源作为前置，不能报告图片已发布。

### F04 — Blog SEO 字段停在内容包，写入与回读规则缺失

- **优先级：high；类别：实现/SEO 字段交付；置信度：高；状态：静态与官方 schema 已确认。**
- 范围：Blog SEO 标题、meta description。
- 证据：`references/blog-package-contract.md:42`、`scripts/lib/merchant-packages.mjs:905-906` 要求 `seoTitle`、`metaDescription`；文章变量示例没有这两个字段；`assets/graphql/article-readback.graphql` 未查询 SEO 对应信息；工作流也没有说明字段映射。
- 官方文章创建/更新输入包含 `metafields`，没有与包字段同名的顶层 SEO 字段。不能直接把包 JSON 当 API 变量。[官方 ArticleCreateInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ArticleCreateInput)、[官方 ArticleUpdateInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ArticleUpdateInput)。
- 影响：文章正文可以发布，但无法据当前合同证明承诺的 SEO 字段已同步。Agent 查文档补齐具有可能性，包内没有可重复的验收路径。
- 建议：先核对当前官方支持的文章 SEO 写入与读取方式，再补映射和逐字段验证；未完成时在回执中明确该字段状态，不把正文成功等同于整包成功。

### F05 — 新旧指令冲突会误阻断合法任务

- **优先级：high；类别：指令合同；置信度：高；状态：静态确认，Blog 模式错误已复现。**
- 范围：Blog 发布、FAQ 冷启动、产品最低资料草稿。
- 证据一：`SKILL.md:206` 将 Approval B 统一要求为 `--mode public`，但 Blog 校验器 `merchant-packages.mjs:759-761` 只支持 `review|write`。合成完整 Blog：write 通过，public 返回 `mode must be review or write`。
- 证据二：`workflow-blog-content.md:28-32` 仍规定缺服务方数据就 `scoring_blocked`，与入口 `SKILL.md:105-117` 允许 FAQ 冷启动冲突。
- 证据三：`workflow-products.md:247-266` 允许最低资料模式延后 decision brief，但同文件创建流程 `278-292` 仍统一要求 brief 全通过并使用 draft 模式；`workflow-product-content.md:7-10` 也仍要求两道内容门在 Approval A 前通过。
- 建议：让模式分支决定唯一前置条件，分别写清 Product minimal/draft/public、Blog review/write；共享参考只链接权威分支，不重复旧规则。

### F06 — minimal 模式错误地放宽了证据资格

- **优先级：high；类别：代码缺陷/证据控制；置信度：高；状态：合成数据已复现。**
- 范围：产品最低资料草稿。
- 证据：`merchant-packages.mjs:340,364-365,389-406` 把多类验证问题全部传入 `deferrable`，minimal 下变成 `supplements`，包括 FAQ 答案资格和已有 brief 的错误。
- 复现：对同一份产品包声明使用尚未确认的 FAQ 答案作为事实，draft 返回 `faq_answer_ineligible`；minimal 返回 `ok: true`，该错误只在补充清单中。
- 影响：虽然仍是非公开草稿，但与“只放宽完整度、事实和证据错误仍阻断”的承诺不一致，未确认答案会进入待发布材料。
- 建议：只将明确允许缺失的完整度错误降级；已提供但不合格、冲突、过期或引用错误的证据必须阻断。缺少 brief 与提供了无效 brief 应分开处理。

### F07 — 缺失或无效指标被报告为真实零值

- **优先级：high；类别：代码缺陷/分析正确性；置信度：高；状态：合成数据已复现。**
- 范围：月度摘要以及复用数值转换的分析输出。
- 证据：`data-center.mjs:154-155,183-199` 主要核对交付方声明的列；`233-238` 将空值、缺失值和非数值转换为 0；`341-354` 无条件计算 GSC 聚合。
- 复现：声明只有 `query,clicks`，clicks 填 `N/A`。数据验证通过，摘要却显示 0 clicks、0 impressions、CTR 0.00%、排名 0.00。
- 影响：客户会把“没有足够数据”理解为“表现确实为零”，后续选题和优化也可能受到误导。
- 建议：按指标验证所需字段和有效数值；使用 `unavailable` 或明确错误表示缺失，分母或输入不足时不计算派生指标。

### F08 — 历史比较先计算，再提醒口径可能不兼容

- **优先级：high；类别：代码缺陷/趋势分析；置信度：高；状态：合成数据已复现。**
- 范围：归档环比、查询变化。
- 证据：`data-center.mjs:257-269` 按当前 `header_row` 读取归档并从路径猜月份；`470-477` 仅检查归档存在 clicks 列，就比较 impressions；`511` 在输出数值后提示可能不兼容。没有归档来源、范围、时区与覆盖窗口的严格比较门。
- 复现：归档只有 `query,clicks`，当前有 impressions=100，摘要仍报告 impressions `0 → 100（+100）`。
- 另见 `480-487`：只遍历当前查询，历史有、当前消失的查询不会列入下跌项；重复查询在历史 Map 中也未聚合。
- 建议：先验证双方元数据及指标完整性，再决定可比较字段；无可确认历史口径时不生成趋势数值。查询变化使用两期键并集并明确数据覆盖范围。

### F09 — 仅交付询盘数据时，报告元数据不完整

- **优先级：medium；类别：代码缺陷/结果汇报；置信度：高；状态：合成数据已复现。**
- 范围：只有 `inquiry_*` 或询盘与标准数据周期不同的交付包。
- 证据：`data-center.mjs:307-327` 只用标准 GSC/GA4 计算报告周期与时区；`521-523` 的来源列表也只有标准数据。询盘表虽有局部日期，缺整体来源和时区链路。
- 复现：manifest 明确声明 2026-08、Asia/Shanghai 的询盘数据，结果仍为 `period: unknown`、时区“未提供”、数据来源空白；默认保存文件名成为 `monthly-summary-unknown.md`。
- 建议：整体元数据覆盖所有实际消费的数据集；展示询盘来源、时区和采集时间。将“询盘表预览”与“对询盘的业务解释及下一动作”分别标明，避免把截断表格当完整分析。

### F10 — Blog 的“已批准 CTA”只校验名称，没有绑定目的地址

- **优先级：high；类别：配置/校验缺口；置信度：高；状态：合成数据已复现。**
- 范围：Blog 询盘按钮与转化入口。
- 证据：`assets/workspace/config/store-profile.json:31` 只记录 `primary_inquiry_cta`；`merchant-packages.mjs:976-983` 验证名称与 URL 格式/正文存在性，没有与已确认目标地址比对。
- 复现：保持正确 CTA 名称，改用另一域名的 HTTPS 地址并放入正文，其余包不变，write 校验仍通过。使用的地址均为合成测试域名，没有请求外站。
- 影响：Agent 或操作者仍可能在人工预览发现错误，但校验器并未兑现“已批准目的地址”的检查，核心线索入口可能错配。
- 建议：在现有 profile 中保存 CTA 名称、规范化 URL、确认来源；包校验比较实际目的地址。允许 WhatsApp 等站外入口时，也须匹配已确认 URL，而非简单禁止所有站外地址。

### F11 — 重复导入或重新生成会覆盖已有工作记录

- **优先级：high；类别：代码缺陷/交接完整性；置信度：高；状态：handoff 覆盖已复现，其他分支静态确认。**
- 范围：同月份 handoff 队列、选题队列、月度摘要。
- 证据：`opsy.mjs:314-316,354-356,432-434` 使用 `writeFileSync` 写固定输出路径，无覆盖拒绝或版本保留；入站任务总是初始化为未选择状态。
- 复现：首次导入后给输出加一条已有记录标记，再导入同一文件；命令 exit=0，原标记消失。
- 影响：客户已添加的决策、备注或跟进信息可能丢失。与工作区保留已有产物的规则冲突，也妨碍服务方回收执行结果。
- 建议：默认拒绝覆盖或生成新 revision；任务按稳定 ID 对照并保留决策/执行状态。显式替换应有预览、原文件快照及结果记录。

## 独立运行边界与待确认设计

| 依赖或场景 | 当前判断 |
| --- | --- |
| 其他 Opsy/运营 Skill | 56 处模块导入全部为 Node 内置模块或包内相对引用；没有外部 npm 模块依赖。主流程无需另一个 Skill 执行内容准备与本地数据处理。 |
| 服务方数据包 | 是已确认业务输入，不构成“依赖其他 Skill”。服务方用什么工具制作，不影响客户侧独立性。 |
| Agency handoff | 兼容外部任务来源，应保留为可选入口；不能替代 Opsy 自己的执行回执。 |
| 深度服务商诊断 | `SKILL.md:166` 明确留给外部运营套件。对当前“消费我们交付的询盘报表”不构成缺陷；若将来要求 Opsy 从原始线索重做深度诊断，则超出现有合同。 |
| 浏览器/视觉读取 | 供应商页面和图片语义核验依靠宿主；已有不可访问时回退到资料补充的规则。需做双宿主实际能力验收。 |
| Word/PDF FAQ | 有提取规范，没有内置通用文件提取器或明确能力探测。宿主能读取则可做，不能读取时应明确请求可读文本/导出格式，不能偷偷要求安装其他 Skill。 |
| 在线图片与商品字段 | F02—F04 的缺口须由 Opsy 自身补齐或明确前置条件，不能默认交给别的 Skill。 |
| Shopify CLI | 官方确认 mutations 默认关闭，需要显式 `--allow-mutations`；模板化命令所用文件参数在当前文档中存在。[官方 store execute](https://shopify.dev/docs/api/shopify-cli/store/store-execute)。未核验客户机器安装版本与授权状态。 |

**设计待确认 D01：本地数据分析是否应在 Shopify 未连接时可用。** 当前 `state-machine.md:40-43` 明确禁止未连接状态的数据分析，入口也遵循此限制；但 `summarize-data` 本身只需本地工作区与数据。它是现行产品规则，不是命令执行 bug。若核心目的要求客户仅凭交付包即可分析，建议新增本地分析就绪判断，与 Shopify 写入就绪分开；在确认前保留原规则。

## PDCA 与 SMART 审阅

以下为 `source: model_review` 的定性结论；不影响静态 gate。

| 阶段 | 状态 | 证据与含义 |
| --- | --- | --- |
| Plan | ok | 核心功能、画像、数据来源、选题与 B2B 边界明确。 |
| Do | weak | 内容工作较完整；本地媒体及部分字段实际写入缺环节（F02—F04）。 |
| Check | weak | 有大量校验与回读要求，但 minimal/CTA/数据指标仍可误通过（F06—F10）。 |
| Act | weak | 有停止与纠错原则；缺少跨会话恢复和版本化交接产物（F01、F11）。 |

| SMART | 状态 | 判断 |
| --- | --- | --- |
| Specific | ok | 三项核心工作及当前不做的业务范围清楚。 |
| Measurable | weak | 内容包可检验，业务字段实际落地和统一结果状态尚未贯通。 |
| Achievable | weak | 有正确的运行环境和输入时可做基础工作，但部分环节依赖 Agent 临时补流程。 |
| Relevant | ok | 画像、FAQ、选题与买家询盘目标直接相关。 |
| Run-bound exit | weak | 有本轮验证原则，缺少新会话可机械读取的已完成/待继续边界。 |

## 建议达到的交付门槛

1. 先修 F05—F10 中已经确认的模式、证据与数据错误，防止错误阻断或错误结论。
2. 打通 F02—F04 的实际字段和媒体路径，让“内容准备完成”与“店铺保存成功”逐字段对应。
3. 完成 F01、F11 的统一结果合同、版本保留和恢复规则；让新会话在读取产物后知道从哪里继续。
4. 仅安装 Opsy，在可控测试店铺与两个目标宿主分别验收产品、Blog、数据及中断恢复。正式外部写入按具体操作审批。

验收标准是客户拿得到正确结果、知道尚缺什么、下一位 Agent 能延续工作；不是只看静态分数、通过测试数量或是否存在日志文件。
