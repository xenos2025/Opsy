# Opsy 客户项目配置标准

修订：2026-09-21（Asia/Shanghai）。本标准按 Opsy 的商品上架、商品更新、Blog 发布与更新、本地数据分析组织配置，不直接导入服务方整套配置。

## 1. 四份基础配置与两份 AI 搜索配置

| 配置 | 负责什么 | 商品上架与更新 | Blog 发布与更新 |
| --- | --- | --- | --- |
| `config/store-profile.json` | 店铺、权限核验、市场语言、买家画像、商业事实与询盘入口 | 确认卖给谁、产品事实和发布对象 | 确认读者、Blog 对象和询盘落点 |
| `config/business-questionnaire.md` | 企业事实采集记录与待确认问题 | 补参数、MOQ、交期等资料 | 补业务经验、采购问题和事实依据 |
| `config/buyer_faq.json` | 买家问题、采购顾虑、答案证据与内容路由 | 决定要回答什么、消除哪些顾虑 | 提供选题、文章角度、FAQ 及适用答案 |
| `config/content_voice.json` | 共用卖家角色、专业能力、语气、必做项与禁用表达 | 指导标题、卖点、描述和 FAQ 表达 | 指导正文、解释方式、FAQ 和 CTA 表达 |
| `config/ai_search_intent.json` | 唯一正式问题库路径、启用状态与审核引用 | 起草前选择适用问题 | 起草前选择适用问题 |
| `config/ai-search/prompts.csv` | 有来源、范围与审核状态的 AI 搜索问题；初始为空 | 规划需要回答的采购问题 | 规划文章需要回答的问题；不替代选题证据 |

**FAQ 决定回答什么；content voice 决定怎样说。两份配置都用于 Product 和 Blog。** 企业事实仍由档案与业务证据确认，写作风格不能充当产品事实。

配置由服务方或 Agent 整理，客户只确认业务事实和表达偏好，不要求客户手写 JSON。商品与 Blog 起草前都读取并选择适用内容；不把整个 FAQ 库机械塞进每个页面。

## 2. 两份内容配置如何生效

### `buyer_faq.json`：问题与答案

沿用 `buyer-faq-v1`，完整空模板见 [buyer_faq.json](../assets/workspace/config/buyer_faq.json)，规则见 [buyer-faq-contract.md](buyer-faq-contract.md)。

- 商品使用 Product 主路由问题与合格答案，也可显式选择 supporting 问题帮助处理采购顾虑。
- Blog 使用 Blog 主路由问题：有数据时辅助选题，冷启动时作为明确标注、无搜索指标的 FAQ 选题来源。
- 问题可信不代表答案已确认。未确认 MOQ、交期、认证等只能列为待补充，不能发布。
- Page、Collection、FAQ Hub 路由保留并交服务方，不自动改成商品或 Blog。
- 通过 `validate-buyer-faq` 校验，再经 `select-faq` 或 `select-content-context` 筛选，Product/Blog 内容包校验引用与答案资格。

### `content_voice.json`：共用写作规则

新项目使用独立 `content-voice-v1` 文件，完整空模板见 [content_voice.json](../assets/workspace/config/content_voice.json)，字段与流程见 [content-voice-contract.md](content-voice-contract.md)。

- 商品和 Blog 共用同一卖家角色；文章形式可以不同，不能每次换一个未经确认的人设。
- `status: ready` 之外，还要有角色、专业能力、买家关系、语气、必做项、禁用表达、证据角度数组和确认时间；空壳或字段类型错误不能解锁内容写入。
- `signature_proof` 无可用证明时可为空，不得为了填配置而编造经验或认证。
- 脚本验证字段与就绪度；自然语言风格是否落实、事实是否准确仍由 Agent 和内容审阅确认。

优先级固定：**独立文件存在时以它为准；只有文件不存在，才兼容旧 `store-profile.json` 中的 `profile.content_voice`。** 不合并两份语气、不自动覆盖旧档案。独立文件损坏、不完整或未确认时提示修复，不回退绕过。

旧项目可继续使用有效的内嵌语气。要迁移时，服务方展示差异，将既有确认内容整理到独立文件并验证；不自动删除旧字段。新项目档案不再预埋另一份语气。重新安装 Skill 不会自动迁移客户配置。

## 3. 初始化清单与使用者

执行只读命令，无需客户项目或店铺连接：

```text
node <skill-root>/scripts/opsy.mjs list-configs --json
```

清单与初始化器共用 [workspace.mjs](../scripts/lib/workspace.mjs)：新空项目为 **6 个 config 文件（含问题库 CSV）、11 个工作区模板**，另有项目根定位文件和条件生成的规则文件。

| 文件 | 实际使用者 |
| --- | --- |
| `config/store-profile.json` | workspace 状态、authorization、Product/Blog 校验；[模板](../assets/workspace/config/store-profile.json) |
| `config/business-questionnaire.md` | Agent 按企业问卷工作流阅读，再整理已确认字段；没有 Markdown 自动全量同步器；[模板](../assets/workspace/config/business-questionnaire.md) |
| `config/buyer_faq.json` | buyer-faq 校验、筛选、内容包与选题流程 |
| `config/content_voice.json` | content-voice 读取与校验、状态检查、内容上下文及 Product/Blog 内容包 |
| `config/ai_search_intent.json` | select-ai-prompts 读取库路径与启用状态；[字段与示例](ai-search-config-contract.md) |
| `config/ai-search/prompts.csv` | ai-prompts.mjs 校验与按范围筛选，Product/Blog 工作流显式读取作规划参考 |
| `data-center/manifest.json` | data-center 校验、候选和分析；仅服务方交付的本地数据；[模板](../assets/workspace/data-center/manifest.json) |
| `ai-log/operations-log.md` | Agent 记录，人和后续 Agent 阅读；[模板](../assets/workspace/ai-log/operations-log.md) |
| `ai-log/handle-changes.csv` | 404 候选读取，忽略 resolved 行；[模板](../assets/workspace/ai-log/handle-changes.csv) |
| `README.md` | 客户与 Agent 的工作区说明；[模板](../assets/workspace/README.md) |
| `.gitignore` | Git 排除本地 inbox、outputs、backups、tmp；[模板](../assets/workspace/.gitignore) |
| 项目根 `shopify-ops.json` | 定位项目内工作区，已有 marker 优先 |
| 项目根 `AGENTS.md` | 宿主读取的项目规则；已有文件保留；[模板](../assets/workspace/AGENTS.template.md) |

新项目只补缺失文件。有内嵌语气的既有档案不自动补空白独立语气，避免遮蔽旧配置。已有 marker 时仍只补缺失 FAQ 与 `inbox/faq/`、`inbox/profile/`；已有 `_project/` 而无 marker 时默认只加 marker。详见 [project-layout.md](project-layout.md)。

## 4. 从服务方资料整理，不搬整套配置

- 企业、店铺缓存、受众和转化配置：核对后整理到 Opsy 档案；不能复制服务方连接状态作为客户电脑的实时授权。
- FAQ 与语气：分别整理到上述独立文件；同名文件也须符合 Opsy 契约。没有整套服务方 JSON 自动转换器。
- 意图、关键词、格式研究：作为带来源的参考，由 Agent 转为 Opsy 的 topicQueue、placement 与 audienceCard；不运行服务方评分器。
- 全站规划、搜索策略、关键词 registry、测量、过滤与外链：仍由服务方维护；客户只接收适用证据、处理好的本地数据或已审核任务。
- `brand_dna.md`、`keywords.csv`、研究版 `prompts.csv` 保存在日期化材料目录，不自动加载。逐题审核后转换为正式问题库的字段；读取方式见 [AI 搜索配置合同](ai-search-config-contract.md)。

已审核任务按 [agency-handoff.md](agency-handoff.md) 导入。选题与落点遵循 [merchant-selection-contract.md](merchant-selection-contract.md)，受众明细遵循 [audience-intake-contract.md](audience-intake-contract.md)。

## 5. 交付前最小检查

1. 项目配置已经整理好；客户打开同一项目即可，无需重新填整套表。
2. 运行 `status --project <root> --json`，检查实际语气来源、缺项与 Product/Blog 能力。
3. 运行 `validate-buyer-faq --file <workspace>/config/buyer_faq.json --json`。空 FAQ 可以保存，但不代表有可用选题。
4. 独立语气运行 `validate-content-voice --file <workspace>/config/content_voice.json --json`；只有字段有效且已确认才返回就绪。
5. 商品与 Blog 各选择适用 FAQ、读取语气，准备内容后运行对应包校验；修改语气或 FAQ 后重新选择上下文、检查旧草稿。
6. 实际写入仍需实时权限核验、内容预览、具体操作批准和回读；通过配置检查不代表已发布。

本轮调整在 Unreleased 中，不修改客户现有配置，不发布新版本。
