# Opsy — Guided Shopify Operations

中文名：**Opsy Shopify 引导式运营助手**

Opsy 是面向 Shopify 初学者和兼职运营者的单入口 Skill，兼容 Codex 与 WorkBuddy。它主要服务 B2B 询盘站，引导完成运营周报、商品运营、Blog 与内容、404 处理、上月数据和店铺连接/建档。服务方交付的 GA4/GSC 快照可以生成 Product/Blog 需求建议；Shopify Operations Skill 也可以交付已经审核的企业主任务队列，由 Opsy 导入后继续安全执行。商品与文章在写入前还要通过共享的买家决策检查，避免只有关键词和字段、没有清晰购买理由。

“操作简单”不代表取消安全控制。Opsy 在连接前只允许业务问卷和公开站点检查；连接后必须先完成轻量店铺建档；所有 Shopify 写入都要经过预览、明确批准、执行和同通道回读。

## 为什么配套交付的独立站体验更完整

Opsy 可以用于符合 V1 范围的 Shopify 独立站；如果站点在建站阶段已经按配套规范完成配置，更多运营能力可以在连接和建档后直接启用。它的优势不是绑定某个站点，而是让建站时建立的结构持续成为运营输入：

- **元字段可以直接、安全地填写**：建站阶段已经定义好 namespace、key、类型和校验规则，运营者只需要逐项补充业务值，不必理解或修改底层定义。
- **月度数据可以直接查询和分析**：标准化的数据导出进入带 manifest、日期范围和归档记录的 `data-center/`，即使客户没有 Google 密钥，Opsy 也能基于服务方每月交付的数据生成可追溯的摘要，并形成需要人工确认的 Product/Blog 关键词建议队列。
- **文案不只完成字段**：PDP 与 Blog 共用买家决策简报，明确目标买家、当前决定、事实到买家价值的转换、主张证据、主要异议、适用边界和下一步；需求数据不能冒充产品事实。
- **商品与内容写入更少临时配置**：店铺档案可以复用已确认的发布渠道、Blog、市场、语言、主 CTA 和对象结构，减少初学者在每次操作中重新判断。
- **运营记录可以持续积累**：统一工作区保存素材、数据快照、周报、写前备份和操作记录，方便客户自己从 GitHub 更新，或接收服务方发送的数据包。

### 功能与前置配置

| 功能 | 必要条件 | 条件未满足时 |
|---|---|---|
| 业务问卷、公开站点检查 | 可访问的公开站点 | 仍可完成问卷；明确标示无法检查的页面 |
| 商品、Blog 草稿与发布 | Shopify CLI 已连接；轻量店铺档案有效；目标 Blog/发布渠道已确认 | 保持只读或准备本地草稿，不写入店铺 |
| 元字段填写 | 店铺已有匹配的元字段定义及校验规则 | 只跳过受影响字段，并生成建站配置处理项 |
| 上月数据查询、分析与关键词建议 | 有效的 `data-center/manifest.json` 和对应月份数据快照；关键词建议至少需要 `gsc_queries` | 显示数据缺失或过期，不生成无依据结论或自动选题 |
| 月度数据更新 | 可快进的 GitHub 更新，或服务方提供的本地数据包 | 保留现有快照，提示选择更新来源 |
| 404 候选补充 | 选填的 `gsc_not_found.csv`、历史记录或已知 handle 变化 | 仍可处理已有候选，不假装已经覆盖 GSC 数据 |
| 服务商任务交付 | Shopify Operations Skill / Ops Coach 输出 `opsy-agency-handoff-v1` CSV | 仅导入 `ready_for_merchant`；不继承任何 Shopify 写入批准 |

其他 Shopify 独立站也可以安装 Opsy。连接后的轻量建档会先验证店铺身份和必填证据，再按商品、Blog、404 和元字段能力分别识别 scope 与对象配置：满足条件的写入先开放，缺少的部分形成明确的补配置清单；本地草稿准备不受无关能力缺失影响。Opsy 不会在基础运营中擅自创建元字段定义，也不会在没有有效导出数据时虚构分析结果。

## 安装

完整 Shopify 写入流程需要：

- Node.js 22.12 或更高版本；
- npm 或其他 Node 包管理器；
- Git 2.28 或更高版本；
- Shopify CLI 4.5.2。

Shopify 尚未连接时，仍可使用业务问卷和公开站点检查。

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

安装器会比较版本、显示目标路径并在变更前确认。升级时旧 Skill 会被归档，不会改动任何客户运营工作区。

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
| 店铺连接未完成 | 业务问卷、公开站点检查、连接引导、运营项目文件夹 |
| 轻量店铺建档未完成 | 只完成店铺档案所需的读取与确认 |
| 运营写入就绪 | 周报、商品、Blog、404、上月数据、连接与档案 |

## 就绪后的主菜单

1. 运营周报
2. 商品运营
3. Blog 与内容
4. 404 处理
5. 上月数据查询 / 数据更新
6. 连接与店铺档案

新商品和新文章默认先创建非公开草稿；回读验证后，必须第二次确认才能正式发布。

## 核心流程

下图与文字同源：状态、写入安全与各工作流的完整示意见 [`docs/diagrams/`](docs/diagrams/)。权威规则仍在 `skills/opsy/SKILL.md` 与 `references/`。

| 流程 | 说明 | 图 |
|---|---|---|
| 单入口与状态机 | `$opsy` → `opsy.mjs status` → 横幅 → 仅展示当前可执行选项；不让运营者选内部 Agent | [01](docs/diagrams/01-entry-state-menu.svg) |
| Skill / 工作区 | 升级 Skill 不动客户数据；`init` 只补缺失文件；永不把 Skill 复制进客户仓库 | [02](docs/diagrams/02-project-layout.svg) |
| 写入安全阶梯 | 店域与 capability → 预读与快照 → `guard-mutation` → 明确批准 → `execute` → `check-response` → 同通道回读 | [03](docs/diagrams/03-write-safety.svg) |
| 商品双批准 | inbox 校验 → 买家决策简报五检查 → Approval A（`DRAFT`）→ 回读 → Approval B（激活/发布） | [04](docs/diagrams/04-product-publish.svg) |
| Blog 双门 | `content_voice` + 决策简报 + craft 记分卡 → A 未发布草稿 → B 发布或定时 | [05](docs/diagrams/05-blog-publish.svg) |
| 上月数据 | Git 快进或本地包更新 → validate / summarize / suggest-keywords；建议队列须人工确认后才进商品/Blog | [06](docs/diagrams/06-monthly-data.svg) |
| 连接与建档 | 问卷与公开检查 → CLI 连接与只读 smoke → 轻量档案 → 按工作流拆分 `write_capabilities` | [07](docs/diagrams/07-connection-profile.svg) |
| 404 分诊 | `refresh-404` 只建本地队列；仅运营者勾选的 `path → target` 才 guard 并写入；禁止无关 URL 跳首页 | [08](docs/diagrams/08-404-redirect.svg) |

### 状态推进（摘要）

```text
workspace_missing → connection_required → profile_required → write_ready
```

- **连接未完成**：只允许问卷、公开站点检查、CLI 连接引导、工作区预览/初始化。
- **识别到服务商工作区**：保留内部工作区，只允许导入已审核任务、预览 Opsy 兼容建档或继续使用内部 Runtime；不自动创建第二份档案。
- **建档未完成**：只允许为轻量档案做必要读取与确认；手填 `complete` 不算通过。
- **写入就绪**：展示六项菜单；写入前仍须该工作流 `write_capabilities.*.write_ready` 为真，否则只显示 `missing` 并允许本地准备。

### 每次 Shopify 写入（摘要）

1. 确认目标 `myshopify.com` 与当前档案状态。
2. 同通道预读；既有对象先写 `backups/`。
3. 保存 query/variables，跑 `guard-mutation`；展示字段级预览后取得**对该集合**的明确批准。
4. `shopify store execute --allow-mutations` → `check-response` → 同通道回读 → 记入 `ai-log/operations-log.md`（无凭证）。
5. 新品/新文章：Approval A ≠ Approval B；批准草稿不等于批准发布。

### 数据与建议（摘要）

- 月度快照来自服务方交付的 `data-center/`，不是实时 Google API。
- `suggest-keywords` 产出 `selection_status: suggested` 队列；商品/Blog 仍要决策简报与运营者确认。
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
install.ps1        Windows 双宿主安装器
install.sh         macOS/Linux 双宿主安装器
```

Skill 内只包含项目无关的说明、工具和模板，不包含客户数据。

## 与相关产品的边界

| 产品 | 给谁 | 形态 | 与 Opsy 的关系 |
|---|---|---|---|
| **Opsy**（本仓库） | 初学者 / 兼职运营 | 单入口 `opsy` + 6 个内部工作流 | 本产品 |
| **Shopify Operations Skill** | 服务商月度运营 | Runtime + 多业务 Agent（数据打分、Blog SEO/GEO、上架、询盘复盘、Ops Coach 等） | 方法来源；不注册进 Opsy，也不被 Opsy 替代 |
| **客户仓库内 `_project/skills/`**（如 Jacquard Works） | 该店的服务商会话 | 客户适配版月度循环 | 深度工作仍走客户代理；只有运营者明确要 `$opsy` 时才用本 Skill |

重叠主题（周报 / Blog / 商品 / 数据 / 404）是**刻意的方法复用**，不是两套菜单并行触发：Opsy 管「简单可执行的操作面」，多 Agent 套件管「打分、诊断、服务商教练」。

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
