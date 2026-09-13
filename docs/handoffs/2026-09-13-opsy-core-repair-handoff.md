# Opsy 核心目的修复验收与交接

**本轮已修复 F01—F11 的实现与流程缺口。当前可以用 Opsy 自带规则、脚本和项目文件组织三项核心工作、生成结果报告并续接任务。真实 Shopify 上传、写入和发布尚未验收，不能把本地测试当作线上完成。**

## 记录依据

- 日期：2026-09-13；时区：Asia/Shanghai；本次修复复检约 05:15—05:20。
- 需求：[核心目的与 UML](../opsy-core-purpose.md)；问题基线：[核心审计](../audits/2026-09-13-opsy-core-audit.md)。本轮授权是用户的“修复”。
- 输入：`skills/opsy/` 当前工作区源码、内部引用、GraphQL/工作区模板、`tests/`、仓库校验脚本与两套安装器；包含修复开始前已有改动，未重置它们。
- 基线 HEAD：`f6c3282693d370eb88be17c1a3f54423405c1e4e`；版本仍为 `0.1.0`，变更列入 Unreleased，未打标签、发布或同步安装。
- 实证：合成数据单元/CLI 回归测试、官方 Shopify GraphQL 验证器、只读 CLI help、结构复检与静态外部动作扫描。没有使用客户店铺或真实经营数据。
- 原始记录：仓库外 `D:/Opsy-audit-evidence/2026-09-13-045217/`，重点为 `repair-npm-test.txt`、`repair-verify-fix.json`、`repair-ship-safety.json` 和 `repair-checks.txt`。

“不依赖其他 Skill”指可分发运行包：唯一入口仍是 `skills/opsy/`，新能力只用 Node 内置模块。宿主 Agent 的读文件/浏览器能力、Node、Shopify CLI、店铺权限和我们交付的数据仍是明确运行条件。开发阶段的审计工具不进入客户运行依赖。

## 逐项修复结果

下表沿用原审计优先级；范围与证据均对应本轮源码。置信度“高”指本地实现/测试证据；涉及远端行为的行同时标记待实店确认。

| 项 | 优先级 / 范围 | 修复与当前状态 | 证据 | 置信度 |
| --- | --- | --- | --- | --- |
| F01 | high；结果、报告、续接 | 新增统一结果合同和 `record-task-result` / `resume-task`。逐对象记录状态、ID、证据、产物、下一负责人和验收条件；保存指纹、拒绝覆盖、发现输入变化。已通过本地验证。 | `scripts/lib/task-results.mjs`；`references/result-handoff-contract.md`；`tests/task-results.test.mjs`、`repair-cli.test.mjs` | 高 |
| F02 | high；单变体 SKU/价格 | 新增实际变体更新模板、变量生成与回读比较；仅更新读回的一个变体，不再把 SKU/价格当作 ProductCreateInput 字段。已验证源码/官方 schema；待实店确认。 | `scripts/lib/write-fields.mjs`；`assets/graphql/product-variant-update.graphql`；`references/write-field-mapping.md`；`tests/write-fields.test.mjs` | 高；live 待确认 |
| F03 | high；本地图片到 Shopify | 新增上传计划、精确授权校验、内存中的分阶段上传、文件处理回读和脱敏回执。记录阶段与已知 ID，超时保留待确认；重复上传被拒绝，续查只读已有文件。已验证本地状态机；待实店上传确认。 | `scripts/lib/image-upload.mjs`；三个 image/staged GraphQL 模板；`references/workflow-image-upload.md`；`tests/image-upload.test.mjs` | 高；live 待确认 |
| F04 | high；Blog SEO 写入 | SEO 标题/描述映射为 Shopify `global.title_tag` / `global.description_tag`，使用读回的 compareDigest；新增 aliases 与字段核验。已验证源码/官方 schema；待实店确认。 | `scripts/lib/write-fields.mjs`；`assets/graphql/article-readback.graphql`；`tests/write-fields.test.mjs` | 高；live 待确认 |
| F05 | high；入口与流程一致性 | 统一 Product draft/minimal/public、Blog review/write、FAQ 冷启动与最低填写路径；草稿许可不代替发布许可；无效证据不能被商家接受理由绕过。静态核对完成。 | `SKILL.md`；`references/workflow-products.md`、`workflow-product-content.md`、`workflow-blog-content.md` | 高 |
| F06 | high；最低填写证据门 | 仅缺失的完整度材料进入 supplements。已提供的无效 brief、FAQ 使用、受众卡、队列、落点、复用证据仍阻断。合成失败用例已通过。 | `scripts/lib/merchant-packages.mjs`；`tests/merchant-packages.test.mjs` | 高 |
| F07 | high；数值正确性 | 缺失指标显示不可用，非法/空数值阻断；缺少分母不计算 CTR/排名。候选队列无 GA4 匹配时保持空值；GA4 users 明示非跨渠道去重求和。已通过回归。 | `scripts/lib/data-center.mjs`；`tests/data-regressions.test.mjs`、`repair-cli.test.mjs` | 高 |
| F08 | high；归档对比 | 比较前要求归档元数据、同来源/范围/时区/筛选与等长不重叠周期；缺指标不比较。完整覆盖时纳入消失查询；否则只比较交集并说明缺行不等于零。已通过回归。 | `scripts/lib/data-center.mjs`；`references/data-contract.md`；`tests/data-regressions.test.mjs`、`data-center.test.mjs` | 高 |
| F09 | medium；询盘报告来源 | 询盘包参与整体周期和时区计算；列出实际使用的当前/归档路径、scope、source、pulled_at；报告记录生成时间与快照依据。已通过回归。 | `scripts/lib/data-center.mjs`；`tests/data-regressions.test.mjs` | 高 |
| F10 | high；CTA 地址 | 现有 profile 增加询盘 URL、确认时间和证据；写入门与状态能力检查均要求确认。错误同站/外站替代地址被拒绝，明确确认的外部入口允许。已通过回归。 | `assets/workspace/config/store-profile.json`；`scripts/lib/workspace.mjs`、`merchant-packages.mjs`；`tests/merchant-packages.test.mjs` | 高 |
| F11 | high；输出与交接记录 | 摘要、关键词、agency queue、404 输出使用独占写入；重跑保留旧文件，指定新路径才能保存修订。任务结果同样拒绝同 run_id 覆盖。已通过 CLI 回归。 | `scripts/opsy.mjs`；`tests/agency-handoff.test.mjs`、`repair-cli.test.mjs`、`task-results.test.mjs` | 高 |

表中 `scripts/`、`references/`、`assets/` 相对于 `skills/opsy/`，`tests/` 相对于仓库根。原基线的行号不再代表修复后位置。

## 验证结果

| 检查 | 修复前 | 修复后 |
| --- | --- | --- |
| `npm test` | 106 / 106 | 125 / 125 |
| `npm run validate` | pass | pass，25 个直接引用 |
| `quick_validate.py` | valid | valid |
| PowerShell / Bash 安装器，Codex + WorkBuddy | dry-run pass | dry-run pass；无安装变更 |
| `git diff --check` | pass | pass |
| 结构 `gate_verdict` | fail | pass |
| `package_health` | valid_skill_package | valid_skill_package |
| 已解决结构 finding 数 | — | 2（含 1 Critical） |
| 新增结构 finding 数 | — | 0 |
| 剩余结构 Critical | 1 | 0 |

`verify_fix.py` 使用原来的 target-local 基线范围，结论 `improved`；未更换比较范围。上述门仅评价静态结构，独立于运行行为。源码回归还覆盖：写入响应为空/错误、实际字段不符、成功对象缺失、部分完成、输入变更、重复输出和上传处理中续查。

Shopify 官方 GraphQL 验证器接受了单变体更新、图片 staging/file-create/readback、Article SEO 回读、产品指定渠道发布回读等新增/修改模板。产品渠道回读明确检查 `publishedOnPublication`，ACTIVE 不等于已发布。平台依据可从 [字段映射](../../skills/opsy/references/write-field-mapping.md)和[图片流程](../../skills/opsy/references/workflow-image-upload.md)访问。

本机 `shopify version` 为 4.7.1，`store execute --help` 核对了使用的参数；Windows Node CLI 入口文件存在。未修改分发工具链基线 4.5.2，也未声称在该基线版本或其他系统上执行过真实上传。

## 静态外部动作检查的剩余限制

`skill-ship-safety` 输出：**static_pass，Critical 0，should_fix 6，coverage partial，execution not_safely_verified**。这是脚本原始判定；没有改写为完整安全验收通过。

| 扫描项 | 原始 finding | 本轮解释与后续 |
| --- | --- | --- |
| `scripts/lib/environment.mjs` | EXT.1 should_fix：存在外部进程，无已识别 dry-run | 用于版本检查；静态扫描无法证明子进程行为。保留运行验证边界。 |
| `scripts/lib/image-upload.mjs` | EXT.1 should_fix：进程/网络，无已识别 dry-run | 实现使用默认 preview、apply + plan hash 授权、响应校验和回执。模拟适配器测试已通过；可信隔离的外部执行绕过测试未完成。 |
| `scripts/opsy.mjs` | EXT.1 should_fix：存在外部进程，无已识别 dry-run | CLI 另有状态/店铺/文件 scope 检查。保留静态告警，不用单元测试代替真实执行证明。 |
| `shopify-cli.md` 的 store auth / execute | 两项 EXT.1 should_fix | auth 是显式连接操作；execute 的写入受 allow-mutations 和工作流授权约束。模板文档无法静态证明实际调用者遵守。 |
| `<skill-root>/scripts/opsy.mjs` | DOC.2 should_fix | 可移植占位路径未进入扫描器命令清单；它只识别了两个 Shopify CLI 命令。补充本地 CLI 回归不改变其 partial 判定。 |

当前环境没有可信的外部执行隔离 runner。真实店铺审批、渠道身份、视觉核验和商业事实仍由执行 Agent 与客户负责。结果记录校验的是保存下来的证据，不是对证据来源真实性的签名认证。

## 下一轮接手与验收

1. 先运行项目 `status`，再对既有任务运行 `resume-task --task <id>`。沿用已知对象 ID；变化的输入先刷新；未知写入结果先查店铺。
2. 选择一个已授权的测试店铺：各完成一份最低资料商品、完整商品、数据选题 Blog 和 FAQ 冷启动 Blog；核对草稿、单变体、图片、SEO、CTA、指定发布渠道与公开页面。
3. 注入上传处理中/写入响应未知的中断，保留回执后新会话续接；验收无重复创建、无未核验成功。
4. 每项保留 `result.json`、`report.md`、`handoff.md`。数据工作附完整分析文档；询盘事实与点击/意图区分，动作有负责人及完成条件。
5. 需要发布新版本时，由维护者同步 VERSION、release/toolchain 元数据、CHANGELOG、用户文案并重新跑仓库检查；本轮没有发布或更新用户已安装的 Skill。

这些 live 项的负责人是维护者/测试店铺授权人；完成条件是保留同渠道响应、字段回读、公开页检查和最终结果包。它们不要求安装其他运营 Skill。

D01 仍为原产品边界：Shopify 未连接时不通过主菜单开展运营分析。用户只要求修复审计缺陷，未要求改变这项明确规则，因此本轮保留。多变体完整运营、技术站点审计、自助 Google 接入和独立关键词难度数值打分也未扩大范围。
