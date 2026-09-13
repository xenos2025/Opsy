# 更新日志

本文件记录 **Opsy — Guided Shopify Operations** 对运营者和安装者可见的变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。发布时同步更新 `VERSION`、`opsy-release.json`、`skills/opsy/VERSION` 和面向用户的版本说明。

## [Unreleased]

尚未打发布标签。当前仓库版本仍为 `0.1.0`。

### Added

- 在 `docs/diagrams/references/grc-blog-content-system/` 归档 GRC Blog UML 全景图和图源，补充图示目录入口；属于参考资料，不修改 Opsy 运行逻辑。

- 补齐 CLI 授权闭环：默认完整核心运营权限包，首次授权计划与恢复许可，实时店铺/实际权限核验，授权失效或权限不足时按原完整权限恢复；网络故障不触发 OAuth。增加单次恢复、超时、并发锁、失败冷却、脱敏回执和任务续接；普通本地 status 不再声称实时授权有效。

- 核心审计修复：增加统一任务结果、客户报告和 handoff；续接保留对象 ID 并检查证据变化；历史输出拒绝覆盖。
- 增加单变体 SKU/价格写入变量生成与回读校验、Blog SEO 特殊字段映射、本地图片分阶段上传及待确认续查；默认仅预览，实际写入需精确授权。
- 修复最低填写模式对已提供无效证据的放行、Blog CTA 地址确认、缺失指标被计零、历史快照口径不一致和询盘单独报告的来源信息；统一 FAQ 冷启动与草稿/发布门说明。

- 数据契约支持服务方交付的询盘分析数据集：manifest 数据集可声明 `header_row` 保留导出标题/口径行；`inquiry_*` 数据集（口径说明、渠道汇总、核心漏斗、国家转化、CTA 明细、同期对比）进入 `summarize-data` 的有界预览（每表最多 8 行 × 6 列）。客户无需自行总结询盘；点击/意图事件不计为真实询盘，真实询盘以销售回传为准。
- `summarize-data` 内置有界历史对比：按数据集 `archive_path` 归档快照计算 GSC 点击/曝光与 GA4 会话的头部环比及最多 5 条查询点击变化；明确禁止把 `archive/` 全量读入会话。
- 商品新增 `--mode minimal` 最低填写通道：身份、证据与安全检查照常拦截；vendor、SEO、SKU、标签、标题候选、FAQ 数量、图片、决策简报、选题队列、落点、受众卡与未填元字段等完整度缺口转入报告 `supplements` 待补充清单，草稿创建后展示；`--mode public` 发布门不变。
- 商品回读模板增加 `onlineStorePreviewUrl`：草稿创建后引导运营者在 Shopify 后台预览草稿，商品不提供本地可视预览。
- Windows 中文控制台适配：交互终端自动 `chcp 65001`，JSON 输出统一 ASCII 转义，GBK 管道捕获不再乱码。
- Product/Blog 起草前增加商家选题队列、单页落点和确认受众卡：`suggest-keywords` 或 `suggest-faq-topics` 成为正式第一步，包内记录 `opsy-topic-queue-v1` 与 `opsy-placement-v1`，`select-content-context` 必须选中一张受众卡。不移植 GRC 打分、全站预埋工作簿或画像库。
- 移植企业主版 Runtime：状态输出固定 `delivered_snapshots_only`，界面不提供 Google API/GA4/GSC 自助授权或实时查询。
- 新增 `profile.merchant_context` 企业画像问卷就绪度；`site-foundation` 只保留企业主、销售和基础运营可回答的画像，不提供 Tracking、CWV、结构化数据或技术报告。
- 新增 `opsy-product-package-v1` 与 `validate-product-package`，支持商家材料优先、服务方数据可选的商品包，并校验标题候选、买家决策、FAQ、元字段定义和首图。
- 新增 `opsy-blog-package-v1` 与 `validate-blog-package`；Blog 必读服务方本地 `data-center`，缺少有效 `gsc_queries` 或 `ga4_landing_pages` 时返回 `scoring_blocked`。企业主无需 Google API。
- 新增与主业务一致的 `buyer-faq-v1`、`validate-buyer-faq` 和临时 `faq-selection-v1`：Product/Blog 只消费安全筛选结果，非合格草稿答案不外露；Product 可显式使用 supporting 问题，Blog 保持主路由；Page、Collection、FAQ Hub 转服务方交接。旧 `faq-library.json` 只提示迁移，不覆盖或删除。
- FAQ 进入 Blog 选题证据链：新增 `suggest-faq-topics`，数据站可用已接受问题扩展聚类、角度、形式、路由和同档优先级；新站可走 `faq_seeded` 非数值化冷启动。`validate-blog-package` 交叉校验 item、语言、范围、路由、引用和影响，并阻止虚构搜索指标。
- 新增纯本地用户画像 HTML 工具、`opsy-audience-intake-v1` 与 Node 校验器；日期化明细保存在 `inbox/profile/`，确认摘要复用 `store-profile.json`，不增加项目配置文件。
- Ops Coach 简化为 `opsy-next-actions-v1`：只交付恰好三项具体行动，并通过 `validate-next-actions` 阻止待办堆积。
- 店铺档案新增 `profile.store_role`：业务模型固定为 `b2b_inquiry`，并记录行业、主要受众、主要市场、内容语言和转化目标。缺失或不是 B2B 询盘模式时，商品与 Blog 停止选题和起草；连接、404、三项行动、服务方数据不受影响。DTC 店铺使用独立 Opsy DTC 包。
- 状态助手新增 `store_role` 三态：`blocked`、`ready_with_warnings`（角色已确认但卖家人声未确认，可中性口吻规划、写入仍禁止）、`ready`。
- 卖家人声接入商品描述：表达顺序为买家决策简报 → 店铺角色与 `content_voice` → 结构 → `descriptionHtml`。同一个角色同时服务 Blog 与 PDP。
- 新增商品描述工艺规范 `workflow-product-content.md`：开头直答加买家价值、结构组件库、2–3 条加粗段落式常见问题、未确认商业事实的兜底措辞、正文不得硬写询盘路由、首图必须为正面整体图。
- 商品新增标题拟法：材质或工艺 + 形态或类型 + 买家应用，先出 2–3 个候选再定稿；多选项产品不得把单个选项锁进标题、handle 与 SEO 标题。
- Blog 改稿新增 28 天冷却（店铺时区）：记录 `last_content_update` 与 `cooldown_until`，冷却期内不得因指标未变再次重写，并列明四类例外。
- 商品与 Blog 共用买家决策简报：第一次批准前检查相关性、清晰度、可信度、风险边界和下一步。
- Blog 起草增加 `content_voice` 与场景工种要求，并补充内容工艺检查。
- 月度数据可生成关键词建议队列；GSC-only 行只供 Product 候选使用，Blog 候选还必须有有效 GA4 落地页证据。建议须人工确认后才进入商品或 Blog。
- README 增加 terracotta 流程说明图，覆盖状态机、工作区、写入安全、商品/Blog 双批准、月度数据、连接建档和 404。
- README 改用 PlantUML 总架构图展示 Skill 链接、配置与证据来源、内部工作流及 Shopify 写入门；原 01–08 流程图保留为营销和讲解素材。
- 新增 Opsy 新项目文件清单与交互式配置流图，说明配置来源及其在 Runtime、Product、Blog 和本周三件事中的完整消费路径。
- 可从 Shopify Operations Skill 导入已审核的 `opsy-agency-handoff-v1` 任务；不继承任何 Shopify 写入批准。
- 识别服务商工作区时，展示「已识别服务商工作区；Opsy 尚未启用」，并保持当前档案与 Shopify 只读。
- 增加受保护的商品草稿示例，便于核验 Approval A 边界、响应校验和同通道回读。

### Changed

- 09 号 UML 总图连线统一改为标准 90° 直角折线（`linetype ortho`），同步 PlantUML、SVG 与 PNG。
- 2026-09-13：同步更新 09 号 PlantUML / SVG / PNG 总图，保留原有 UML 组件视觉风格；补充三项核心与辅助工作流分组、可选上游边界、CLI 授权恢复、线索与可比历史、选题与执行校验，以及结果报告和任务续接回路。
- 2026-09-13：README 按产品上架、Blog 发布、运营数据与线索分析重组；明确画像、数据、选题评估对 SEO/GEO 的作用与实现边界。保留原 SVG 组件总图直接展示，新增 Mermaid 架构摘要和 UML 时序图补充 CLI 授权恢复、回读、结果汇报与 handoff；客户介绍同步更新。
- 补充安装与更新指引：同版本源码需显式 `Force`，先 dry-run；区分源码、宿主安装副本和正式 Release，披露工具链基线与本轮核对版本差异及真实店铺验收状态。
- 主菜单改为“本周三件事、商品、Blog、404、服务方数据、连接与企业画像”；移除公开站点检查和企业主自行 Google 数据更新入口。
- `write_capabilities.products` 与 `write_capabilities.blog` 现在把店铺角色和卖家人声作为写入前置证据，缺失项出现在各自的 `missing` 列表里。
- 加固 Shopify 写入守卫：预读、变量校验、`guard-mutation`、明确批准、响应契约和同通道回读。
- 收紧仓库同步规则：`promo/` 与 `docs/adr/` 不同步到 GitHub；`tests/` 必须随仓库同步，供 CI 运行。

## [0.1.0] - 2026-07-29

V1 首次发布基线。官方依据为 Shopify CLI、Store 认证、Store execute 与 Admin GraphQL `2026-07`。

### Added

- 单入口 `$opsy`：按店铺连接、轻量建档和写入能力展示当前可执行选项。
- 六个内部工作流：运营周报、商品运营、Blog 与内容、404 处理、上月数据、连接与店铺档案。
- 新商品和新文章采用双批准：先创建非公开草稿，回读成功后再批准发布或定时。
- 面向 Codex 与 WorkBuddy 的双宿主安装器与可恢复卸载。
- 运营工作区初始化：新建项目默认 `shopify-ops/`，已有仓库沿用定位文件和现有目录。
- 月度 `data-center/` 快照校验、摘要与只读查询；不把导出数据当作实时 Google API。
- 写入安全阶梯：店域确认、预读快照、变量守卫、预览批准、执行、响应检查、同通道回读。

### Changed

- CI 运行时更新为当前 GitHub Actions 环境。

[Unreleased]: https://github.com/xenos2025/Opsy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/xenos2025/Opsy/releases/tag/v0.1.0
