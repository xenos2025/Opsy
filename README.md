# Opsy — Guided Shopify Operations

中文名：**Opsy Shopify 引导式运营助手**

Opsy 是面向企业主、销售和基础运营的单入口 Skill，兼容 Codex 与 WorkBuddy。它服务 B2B 询盘站，引导完成“本周三件事”、商品运营、Blog 与内容、FAQ 资料整理、404 处理、服务方数据导入和企业画像。Product 可以从企业画像、销售问题和商家材料开始；Blog 总是先检查本地 `data-center`，有 GSC/GA4 时走数据选题，新站无数据时可由已接受的 FAQ 问题生成不带搜索指标的冷启动选题。商品与文章在写入前还要通过共享的买家决策检查和各自的可执行包校验，避免只有关键词和字段、没有清晰购买理由。

“操作简单”不代表取消安全控制。Opsy 在连接前只允许企业画像问卷、本地 FAQ 资料整理、连接引导和工作区检查；连接后必须先完成轻量店铺建档；所有 Shopify 写入都要经过预览、明确批准、执行和同通道回读。Opsy 不向企业主开放 Google API，也不提供 Tracking、Core Web Vitals 或结构化数据验收。

## 为什么配套交付的独立站体验更完整

Opsy 可以用于符合 V1 范围的 Shopify 独立站；如果站点在建站阶段已经按配套规范完成配置，更多运营能力可以在连接和建档后直接启用。它的优势不是绑定某个站点，而是让建站时建立的结构持续成为运营输入：

- **元字段可以直接、安全地填写**：建站阶段已经定义好 namespace、key、类型和校验规则，运营者只需要逐项补充业务值，不必理解或修改底层定义。
- **服务方数据可以本地复用**：标准化的数据交付进入带 manifest、日期范围和归档记录的 `data-center/`。企业主不配置 Google 密钥；Product 没有数据仍可继续，Blog 有数据时优先走数据选题，新站可由已接受 FAQ 问题走非数值化冷启动，两个来源都不可用才返回 `scoring_blocked`。
- **文案不只完成字段**：PDP 与 Blog 共用买家决策简报，明确目标买家、当前决定、事实到买家价值的转换、主张证据、主要异议、适用边界和下一步；需求数据不能冒充产品事实。
- **先确认对谁说话，再决定怎么说**：店铺档案里的业务模型、受众、市场、内容语言、转化目标构成店铺角色，卖家人声在其之上决定语气。两者都确认后，商品描述和 Blog 才允许起草，避免把 B2B 与 B2C 的决策混在一篇里。
- **商品与内容写入更少临时配置**：店铺档案可以复用已确认的发布渠道、Blog、市场、语言、主 CTA 和对象结构，减少初学者在每次操作中重新判断。
- **运营记录可以持续积累**：统一工作区保存画像、素材、数据快照、三项行动、写前备份和操作记录，便于企业主接收服务方数据包并继续安全操作。
- **散乱 FAQ 可以沉淀为业务配置并参与选题**：Word、PDF、表格、聊天或销售问答先进入本地收件箱，再按来源、语言、范围、问题状态、答案状态、冲突和路由整理进 `config/buyer_faq.json`。已接受问题可扩展数据主题或为新站提供无搜索指标的冷启动主题；只有另行通过发布门的答案才可成为公开事实。
- **用户画像可以用本地 HTML 分步填写**：工具把完整证据下载到 `inbox/profile/<日期>/audience-intake.json`，只把确认后的摘要写回现有 `store-profile.json`，不增加第六个长期配置文件。

### 功能与前置配置

| 功能 | 必要条件 | 条件未满足时 |
|---|---|---|
| 企业画像问卷 | 企业主、销售或基础运营可确认经营事实 | 记录缺失项；不转成技术审计 |
| FAQ 资料整理与选题种子 | FAQ 文件或销售问答；问题来源、语言、范围和路由可确认 | 问题可保留为选题/异议信号；未过答案门的内容不成为公开事实 |
| 商品草稿与发布 | Shopify CLI 已连接；轻量店铺档案有效；店铺角色与卖家人声已确认；目标发布渠道已确认 | 保持只读或准备本地草稿，不写入店铺 |
| 元字段填写 | 店铺已有匹配的元字段定义及校验规则 | 只跳过受影响字段，并生成建站配置处理项 |
| Blog 选题、草稿、更新与发布 | 有效本地 `data-center`，或新站有效空 manifest + 已接受的 Blog FAQ 问题；Shopify 写入另需连接、角色、人声和目标 Blog | 两种证据都不可用时返回 `scoring_blocked`；FAQ 冷启动不得声明搜索指标 |
| 服务方数据摘要与建议 | 有效的本地 `data-center/manifest.json` 和对应快照 | 显示未交付或过期；Product 可继续，Blog 仅可走 FAQ 问题冷启动或保持 `scoring_blocked` |
| 服务方数据导入 | 服务方提供的兼容本地数据包 | 保留现有快照，不要求企业主连接 Google API |
| 404 候选补充 | 选填的 `gsc_not_found.csv`、历史记录或已知 handle 变化 | 仍可处理已有候选，不假装已经覆盖 GSC 数据 |
| 服务商任务交付 | Shopify Operations Skill / Ops Coach 输出 `opsy-agency-handoff-v1` CSV | 仅导入 `ready_for_merchant`；不继承任何 Shopify 写入批准 |

其他 Shopify 独立站也可以安装 Opsy。连接后的轻量建档会先验证店铺身份和必填证据，再按商品、Blog、404 和元字段能力分别识别 scope 与对象配置：满足条件的写入先开放，缺少的部分形成明确的补配置清单；本地草稿准备不受无关能力缺失影响。Opsy 不会在基础运营中擅自创建元字段定义，也不会在没有有效导出数据时虚构分析结果。

## 安装

完整 Shopify 写入流程需要：

- Node.js 22.12 或更高版本；
- npm 或其他 Node 包管理器；
- Git 2.28 或更高版本；
- Shopify CLI 4.5.2。

Shopify 尚未连接时，仍可完成企业画像问卷和工作区检查。

### Windows

克隆仓库或解压 Release 后，在 PowerShell 运行：

```powershell
.\install.ps1
```

安装器会自动检测 Codex 与 WorkBuddy。也可以显式选择：

```powershell
.\install.ps1 -Host Both
.\install.ps1 -Host Codex
.\install.ps1 -Host WorkBuddy
```

### macOS / Linux

```bash
./install.sh
./install.sh --host both
```

安装器会比较版本、显示目标路径并在变更前确认。升级时旧 Skill 会被归档，不会改动任何客户运营工作区。版本变更见 [CHANGELOG.md](CHANGELOG.md)。

## 开始使用

在 Codex 或 WorkBuddy 中打开 Shopify 运营项目，然后输入：

```text
$opsy
```

Opsy 会寻找 `shopify-ops.json`、判断当前状态，并只展示现在可以执行的选项。全新项目可直接说：

```text
使用 $opsy 检查这个项目，并预览运营项目文件夹方案。
```

## 三个状态

| 状态 | 可执行内容 |
|---|---|
| 店铺连接未完成 | 企业画像问卷、本地 FAQ 资料整理、连接引导、运营项目文件夹 |
| 轻量店铺建档未完成 | 完成店铺档案所需的读取与确认，或整理本地 FAQ 资料 |
| 运营写入就绪 | 本周三件事、商品、Blog、404、服务方数据、连接与企业画像 |

## 就绪后的主菜单

1. 本周三件事
2. 商品运营
3. Blog 与内容
4. 404 处理
5. 导入服务方数据 / 查看已有摘要
6. 连接与企业画像

新商品和新文章默认先创建非公开草稿；回读验证后，必须第二次确认才能正式发布。

## 核心流程

下图与文字同源：状态、写入安全与各工作流的完整示意见 [`docs/diagrams/`](docs/diagrams/)。权威规则仍在 `skills/opsy/SKILL.md` 与 `references/`。

| 流程 | 说明 | 图 |
|---|---|---|
| 单入口与状态机 | `$opsy` → `opsy.mjs status` → 横幅 → 仅展示当前可执行选项；不让运营者选内部 Agent | [01](docs/diagrams/01-entry-state-menu.svg) |
| Skill / 工作区 | 升级 Skill 不动客户数据；`init` 只补缺失文件；永不把 Skill 复制进客户仓库 | [02](docs/diagrams/02-project-layout.svg) |
| 写入安全阶梯 | 店域与 capability → 预读与快照 → `guard-mutation` → 明确批准 → `execute` → `check-response` → 同通道回读 | [03](docs/diagrams/03-write-safety.svg) |
| 商品双批准 | 商家材料 → 商品包校验 → 买家决策与工艺门 → Approval A（`DRAFT`）→ 回读 → Approval B（激活/发布） | [04](docs/diagrams/04-product-publish.svg) |
| Blog 双门 | 销售问题/商家主题 → Blog 包校验 → 决策与 craft 门（改稿另加 28 天冷却）→ A 未发布草稿 → B 发布或定时 | [05](docs/diagrams/05-blog-publish.svg) |
| 服务方数据 | 仅本地交付包 → validate / summarize / suggest-keywords；没有数据时 Product 可继续，新站 Blog 可用已接受 FAQ 问题冷启动 | [06](docs/diagrams/06-monthly-data.svg) |
| 连接与企业画像 | 企业画像问卷 → CLI 连接与只读 smoke → 轻量档案 → 按工作流拆分 `write_capabilities` | [07](docs/diagrams/07-connection-profile.svg) |
| 404 分诊 | `refresh-404` 只建本地队列；仅运营者勾选的 `path → target` 才 guard 并写入；禁止无关 URL 跳首页 | [08](docs/diagrams/08-404-redirect.svg) |
| 项目配置流 | 说明每份配置从哪里来，并追踪到 Runtime、Product、Blog 与本周三件事的实际用途 | [文件清单](docs/opsy-project-file-inventory.md) · [交互图](docs/diagrams/opsy-project-config-dataflow.html) |

### 状态推进（摘要）

```text
workspace_missing → connection_required → profile_required → write_ready
```

- **连接未完成**：只允许企业画像问卷、本地 FAQ 资料整理、CLI 连接引导、工作区预览/初始化。
- **识别到服务商工作区**：保留内部工作区，只允许导入已审核任务、预览 Opsy 兼容建档或继续使用内部 Runtime；不自动创建第二份档案。
- **建档未完成**：只允许为轻量档案做必要读取与确认；手填 `complete` 不算通过。
- **写入就绪**：展示六项菜单；写入前仍须该工作流 `write_capabilities.*.write_ready` 为真，否则只显示 `missing` 并允许本地准备。
- **买家可见文案另有前置**：`store_role.business_model` 必须是 `b2b_inquiry`；企业画像、人声和事实来源保持可追溯。DTC 店铺使用独立 Opsy DTC 包。404、三项行动和服务方数据不受内容角色缺失影响。

### 每次 Shopify 写入（摘要）

1. 确认目标 `myshopify.com` 与当前档案状态。
2. 同通道预读；既有对象先写 `backups/`。
3. 保存 query/variables，跑 `guard-mutation`；展示字段级预览后取得**对该集合**的明确批准。
4. `shopify store execute --allow-mutations` → `check-response` → 同通道回读 → 记入 `ai-log/operations-log.md`（无凭证）。
5. 新品/新文章：Approval A ≠ Approval B；批准草稿不等于批准发布。

### 数据与建议（摘要）

- 数据快照只来自服务方交付的 `data-center/`，不是实时 Google API；Blog 有数据时以其为选题主证据，新站可使用已接受 FAQ 问题的非数值化冷启动通道。
- `suggest-keywords` 产出数据建议队列；`select-faq` 为 Product/Blog 提供不落盘的安全问题筛选结果；`suggest-faq-topics` 产出不声明搜索需求的 FAQ 种子。Blog 包必须记录 `data_backed` 或 `faq_seeded`、FAQ 影响和运营者确认。
- GSC/GA4 是需求证据，不能冒充产品事实、认证或商业条款。

## 项目兼容

- 全新项目：默认创建 `shopify-ops/` 和根目录 `shopify-ops.json`。
- 已有仓库：读取定位文件并沿用现有工作区，包括 `_project/`。
- 只有 `_project/`、没有定位文件：先预览，再选择是否只补定位文件。
- 已有 `AGENTS.md` 永不覆盖。

## 仓库结构

```text
skills/opsy/       可分发的唯一主 Skill
tests/             状态、数据、写入保护和契约测试
docs/diagrams/     流程说明图（SVG）
CHANGELOG.md       版本更新日志
install.ps1        Windows 双宿主安装器
install.sh         macOS/Linux 双宿主安装器
```

Skill 内只包含项目无关的说明、工具和模板，不包含客户数据。

## 与相关产品的边界

| 产品 | 给谁 | 形态 | 与 Opsy 的关系 |
|---|---|---|---|
| **Opsy**（本仓库） | 企业主 / 销售 / 基础运营 | 单入口 `opsy` + 6 个经营入口 | 本产品 |
| **Shopify Operations Skill** | 服务商月度运营 | Runtime + 多业务 Agent（数据打分、Blog SEO/GEO、上架、询盘复盘、Ops Coach 等） | 方法来源；不注册进 Opsy，也不被 Opsy 替代 |
| **客户仓库内 `_project/skills/`**（如 Jacquard Works） | 该店的服务商会话 | 客户适配版月度循环 | 深度工作仍走客户代理；只有运营者明确要 `$opsy` 时才用本 Skill |

重叠主题（三项行动 / Blog / 商品 / 数据 / 404）是**刻意的方法复用**，不是两套菜单并行触发：Opsy 管「企业主可执行的操作面」，多 Agent 套件管「打分、诊断、技术验收和服务商教练」。

## 卸载

```powershell
.\uninstall.ps1 -Host Both
```

```bash
./uninstall.sh --host both
```

卸载采用可恢复归档，只处理共享 `opsy` Skill，不扫描或删除客户工作区。

## 官方平台依据

Opsy V1 于 2026-07-29 按 Shopify 官方 [CLI 要求](https://shopify.dev/docs/api/shopify-cli)、[Store 认证](https://shopify.dev/docs/api/shopify-cli/store/store-auth)、[Store execute](https://shopify.dev/docs/api/shopify-cli/store/store-execute) 和 [Admin GraphQL 2026-07](https://shopify.dev/docs/api/admin-graphql/2026-07) 建立基线。仓库会检查模板结构、operation 契约和安全守卫；每次真实写入前仍须按所选 API 版本用当前官方 schema 或受信任店铺工具重新验证对应模板。
