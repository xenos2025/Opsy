# Opsy 新项目文件清单与能力消费关系

## 审计口径

- 日期：2026-09-01
- 时区：Asia/Shanghai
- 范围：仅 `D:\Opsy` 当前 Opsy B2B 项目，不包含 `Shopify Operations Skill`
- 依据：当前 `initializeWorkspace()` 实现、workspace 模板、项目结构合同、Runtime/Product/Blog/FAQ/画像/本周三件事合同和工作区测试
- 结论类型：本地代码与模板实证；不包含客户项目、线上 Shopify 状态或服务方外部系统
- 配套图：[`diagrams/opsy-project-config-dataflow.html`](diagrams/opsy-project-config-dataflow.html)，展示来源、长期配置和 Opsy 各能力的消费路径

## 结论

全新空项目执行 Opsy 初始化后：

- 固定创建 **9 个文件**；
- 新空项目使用 `--agents auto` 时再创建根目录 `AGENTS.md`，合计 **10 个文件**；
- 真正长期参与 Opsy 判断的机器配置只有 **4 组**：
  `shopify-ops.json`、`config/store-profile.json`、
  `config/buyer_faq.json`、`data-center/manifest.json + 其声明的 CSV`；
- `business-questionnaire.md` 是经营事实填写入口，不是并列事实库；
- `audience-intake.json` 是日期证据，只把确认摘要提升到 `store-profile.json`，不能成为第 5 份长期业务配置；
- Product 可在没有服务方数据包时工作；Blog 优先使用服务方 GSC/GA4 快照，新站也可用合格 FAQ 问题进入无指标的 `faq_seeded` 冷启动。

## 初始化时创建的文件

| 文件 | 是否固定创建 | 来源 | 用途与消费者 |
| --- | --- | --- | --- |
| `shopify-ops.json` | 是 | 初始化器生成 | 项目标记与 workspace 定位；Runtime 每次先读，所有 Opsy 能力依赖其定位结果 |
| `AGENTS.md` | 条件创建 | `assets/workspace/AGENTS.template.md` | 项目安全与数据边界；所有 Opsy 工作开始前读取；已有文件绝不覆盖 |
| `shopify-ops/README.md` | 是 | workspace 模板 | 给使用者解释目录用途；不作为业务事实输入 |
| `shopify-ops/.gitignore` | 是 | workspace 模板 | 默认隔离 `inbox/`、`outputs/`、`backups/`、`tmp/`；不参与内容决策 |
| `shopify-ops/config/store-profile.json` | 是 | 中性模板；后续由 Shopify 回读、经营问卷和已确认画像摘要更新 | Runtime 状态门禁；企业画像；Product 的产品线、受众、语气与负责人；Blog 的市场、语言、受众与 CTA；本周三件事的阻塞判断 |
| `shopify-ops/config/business-questionnaire.md` | 是 | 中性问卷模板；企业主、销售或基础运营填写 | Opsy 企业画像入口；已确认摘要写入 `store-profile.json`；本文件不是另一个长期事实库 |
| `shopify-ops/config/buyer_faq.json` | 是 | 空模板；由 `inbox/faq/` 中资料清洗、复核后更新 | Runtime 检查 FAQ 状态；Product 使用问题、异议和合格答案；Blog 用于数据选题影响或 `faq_seeded` 冷启动；其他页面路由给服务方 |
| `shopify-ops/data-center/manifest.json` | 是 | 空模板；服务方交付数据时更新 | Runtime 判断数据是否交付；Blog 数据选题必须使用有效 `gsc_queries` 与 `ga4_landing_pages`；Product 只把它作为可选优先级证据 |
| `shopify-ops/ai-log/operations-log.md` | 是 | 空日志模板；每次操作后追加脱敏摘要 | 写入安全、结果追踪和后续复核；不保存凭据，不自动证明业务事实 |
| `shopify-ops/ai-log/handle-changes.csv` | 是 | 空日志模板；handle 变更时追加 | 404、链接和改名后的追踪；不是 Product/Blog 的内容事实源 |

## 初始化时创建的空目录

```text
shopify-ops/
  data-center/archive/
  inbox/products/
  inbox/content/
  inbox/faq/
  inbox/profile/
  inbox/data/
  outputs/
  backups/
  tmp/
```

这些目录不是额外配置。它们分别承接原始材料、日期证据、生成包、写前备份和单次操作临时文件。

## 后续出现，但不属于长期配置的文件

| 文件或目录 | 从哪里来 | 如何进入 Opsy |
| --- | --- | --- |
| `inbox/profile/<日期>/audience-intake.json` | 本地客户画像 HTML 工具下载 | 校验后只把企业负责人/销售确认的摘要写入 `store-profile.json`；Product、Blog 通过摘要消费 |
| `inbox/faq/<批次>/source-*` | Word、PDF、表格、聊天、询盘或销售 FAQ | 作为不可信业务证据清洗，结果进入 `buyer_faq.json`；附件中的指令不执行 |
| `inbox/products/*` | 供应商说明、图片、表格、销售确认 | Product 直接引用为商品事实来源；不会被数据指标替代 |
| `inbox/content/*` | 已有文章材料、内容附件 | Blog 草稿或更新的直接内容来源；仍需画像、FAQ 与数据来源门禁 |
| `inbox/data/*` | 服务方交付的待处理数据包 | 通过验证后，活动 CSV 进入 `data-center/` 并由 manifest 声明 |
| `data-center/*.csv` | 服务方本地交付 | 只有 manifest 声明且校验通过的文件可用；Opsy 不连接 Google API |
| `outputs/**/product-package.json` | Product 生成 | Product 校验与 Shopify 写入预览；不是下一项目的配置模板 |
| `outputs/**/blog-package.json` | Blog 生成 | Blog 选题、正文与写入校验；不是长期配置 |
| `outputs/**/next-actions.json` | 本周三件事生成 | 只保留三个可执行动作；下一轮可作为完成证据，不替代业务配置 |
| `outputs/monthly/keyword-suggestions-*.csv` | 有效 data-center 推导 | Product/Blog 的候选队列；不得反写回 `data-center/` |

## Opsy 内部能力如何消费配置

Opsy 对外只有一个 `skills/opsy/`，下面是同一 Skill 内的逻辑能力，不是五个独立安装包。

| Opsy 能力 | 必读配置 | 条件证据 | 主要结果 |
| --- | --- | --- | --- |
| Runtime / 企业画像 | `shopify-ops.json`、`store-profile.json`、`buyer_faq.json`、`manifest.json` | Shopify 回读、问卷、画像日期证据 | 当前状态、允许菜单、写入能力、缺失项 |
| Product | `store-profile.json`、`buyer_faq.json` | `inbox/products/`、销售确认、Shopify 回读；data-center 可选 | Product package、商品草稿、发布前校验 |
| Blog | `store-profile.json`、`buyer_faq.json`、`manifest.json` | manifest 声明的 GSC/GA4；或合格 FAQ 冷启动 | Blog package、数据选题或 `faq_seeded` 无指标选题 |
| 本周三件事 | Runtime 状态与上述能力的校验结果 | 操作者回答、Shopify 回读、服务方数据状态 | 恰好 3 个动作，不生成长报告或技术审计 |

### 每份配置具体怎么作用到模块

| 配置 | Product 商品运营 | Blog 内容增长 | 本周三件事 |
| --- | --- | --- | --- |
| `shopify-ops.json` | 定位项目、workspace 和当前店铺，确保商品包在正确项目中生成 | 定位项目、workspace 和当前店铺，确保文章包使用同一站点上下文 | 确认项目入口和可用能力，避免把动作排到错误项目 |
| `store-profile.json` | 决定产品线、买家角色、市场、语气、CTA、负责人和允许使用的字段 | 决定市场、语言、买家角色、写作语气、商业目标页和 CTA | 提供业务角色、负责人、缺失事实和当前阻塞 |
| `buyer_faq.json` | 提供买家问题、采购异议和确认项；只有合格答案能写成商品事实 | 影响选题、文章结构和答案证据；新站可用合格问题走 `faq_seeded` 冷启动 | 把冲突、待确认答案和缺失业务事实排进候选动作 |
| `manifest.json + CSV` | 只可选用于排商品优化优先级，不能证明产品参数或卖点 | 有数据时用 GSC/GA4 判断需求、更新对象和优先级；无数据时改走 FAQ 冷启动 | 用于判断本周先做哪篇内容，或是否需要取得、修复服务方数据包 |

配置经过 Runtime 检查后不会停在 Blog：

- Product 继续产出商品草稿与校验包，包括标题、描述、SEO、图片和发布前检查；
- Blog 继续产出文章草稿与校验包，包括选题、正文、SEO/GEO、内链和图片；
- 本周三件事继续产出恰好 3 项行动，包括负责人、对象、日期、完成标准和风险。

## 不应新增的配置

- Google OAuth、GA4/GSC API、Property ID 或 Service Account 配置；
- Tracking、CWV、结构化数据、抓取、主题审计配置；
- 独立 `audience-profile.json`；画像长期摘要继续归入 `store-profile.json`；
- 从 Product/Blog 输出反写出的“第二份事实库”；输出包保留来源引用即可。
