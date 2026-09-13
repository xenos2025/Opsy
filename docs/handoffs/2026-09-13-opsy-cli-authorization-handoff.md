# Opsy CLI 授权生命周期补齐交接

- 日期：2026-09-13，Asia/Shanghai；完整测试与安装器验证时间 05:33。
- 范围：Opsy 源码中的首次授权、实时权限核验、失效恢复和任务续接。
- 输入与依据：本次工作区源码；`tests/authorization.test.mjs` 的合成 CLI 响应；本机 Shopify CLI 4.7.1 帮助与实现；下列 Shopify 官方文档。没有使用客户店铺、真实 Token、客户数据包或真实发布结果作为验证依据。
- 状态：本地实现与自动化验证完成；未发布、未更新宿主已安装的 Skill，真实店铺 OAuth 仍待验证。

## 已补齐

| 原缺口 / 范围 | 严重度 | 当前行为与证据 | 置信度 / 验证状态 |
| --- | --- | --- | --- |
| 首次使用没有统一运营权限计划 | 高 | `authorization-scopes.json` 声明商品、Blog、发布渠道和媒体的 8 个读写 scope；`auth-plan` 展示用途、目标店铺和完整命令；审批绑定计划摘要 | 高 / 代码与合成测试已验证 |
| 保存过连接配置被误当作当前授权有效 | 高 | `auth-stores` 仅列本地注册；`ensure-auth` 查询店铺身份与 `currentAppInstallation.accessScopes`；普通 `status` 不开放写入 | 高 / 代码与合成测试已验证；真实 API 待验证 |
| Token 失效、缺权限后无法恢复 | 高 | 优先由 CLI 自行刷新；已确认自动恢复的同一计划可发起一次完整 scope 的 OAuth，随后再次实时核验 | 高 / 恢复状态机已验证；浏览器授权与真实刷新待验证 |
| 恢复反复触发或误把网络问题当授权失效 | 中 | 区分网络、限流、权限拒绝、错误店铺与授权失效；同工作区锁、3 分钟超时、10 分钟冷却；授权不足交管理员处理 | 高 / 合成故障与并发测试已验证 |
| 授权中断后任务结果丢失或重复写入 | 高 | 生成脱敏授权回执；`--task` 载入既有 ID 和证据状态；要求先回读中断操作，不自动重放 mutation | 高 / 任务续接测试已验证；真实写入回读待验证 |
| 依赖官方插件或其他 Skill 才能授权 | 高 | 新授权模块只使用 Node 内置模块与 Shopify CLI，入口和操作说明随单一 Opsy Skill 分发 | 高 / 静态依赖与本地命令已验证；无插件真实店铺验收待完成 |

权限“全部”指用户确认的功能计划：默认包含商品、Blog、发布渠道、媒体；404 和扩展建档为可选项。运营分析读取服务方本地数据包，不请求 Google、订单或客户权限。扩展功能需要确认新的完整计划。OAuth 同意不会授予商品或 Blog 写入批准。

## 实现入口

- [授权使用说明](../../skills/opsy/references/authorization-lifecycle.md)：首次使用、权限用途、恢复、故障处理。
- [权限目录](../../skills/opsy/assets/authorization-scopes.json)、[只读核验查询](../../skills/opsy/assets/graphql/auth-status.graphql)。
- [授权实现](../../skills/opsy/scripts/lib/authorization.mjs)、[CLI 进程封装](../../skills/opsy/scripts/lib/shopify-cli-runtime.mjs)、[CLI 入口](../../skills/opsy/scripts/opsy.mjs)。
- [授权测试](../../tests/authorization.test.mjs)、[任务报告与交接规范](../../skills/opsy/references/result-handoff-contract.md)。

运行时只保存店铺、权限、核验时间、版本、批准引用和尝试状态，不读取或复制 CLI 凭据文件，不转发原始 OAuth 输出。授权期间检测到画像文件被其他操作改动会停止保存，保留对方改动。

## 验证

- `npm test`：139/139 通过，其中新增授权用例 14 个；响应为合成适配器，不能替代真实店铺端到端验收。
- `npm run validate`：通过，26 个 Skill 直接引用通过检查。
- Skill creator `quick_validate.py`：通过。
- PowerShell 与 Bash 安装器均以 Both + dry-run 通过；没有改动全局 Skill。
- `git diff --check`：通过。
- 21 个运行时脚本语法检查通过；Skill 内 Markdown 文件链接无断链，用户名、用户绝对路径及指定凭据特征残留扫描无命中。
- 测试日志保存在本次开发环境的 `D:/Opsy-audit-evidence/2026-09-13-045217/auth-npm-test.txt`，不是客户交付数据。

## 继续工作

1. 开发维护者：发布前确定支持的 CLI 版本。仓库原工具链声明仍为 4.5.2；本轮核对的是本机 4.7.1，不能宣称已在 4.5.2 验证新流程。按发布规范同步版本与工具链元数据，再更新宿主安装副本。
2. 店铺管理员配合实施人员：在测试店铺确认具体权限计划，完成首次浏览器授权；核验实际 scopes、店铺 ID 和本地回执，确认无官方插件也能完成。
3. 实施人员：在独立测试连接中验证授权失效与缺权限恢复，不撤销正在用于客户任务的授权。验收条件为完整计划恢复、实际权限复核通过、任务 ID 保留，未知写入先回读。
4. 若浏览器未打开：提供 `auth-plan` 的安全命令供本地终端运行，再次执行 `ensure-auth --apply`；若权限仍不足，由管理员处理，禁止无限重试。

真实 OAuth 需要人员在 Shopify 页面登录并同意；“自动恢复”指自动检测、发起已批准的恢复与复核，不能绕过 Shopify 登录或管理员权限限制。

## 官方依据

- [Store auth](https://shopify.dev/docs/api/shopify-cli/store/store-auth)
- [Store auth list](https://shopify.dev/docs/api/shopify-cli/store/store-auth-list)
- [Current app installation](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentappinstallation)
- [Access scopes](https://shopify.dev/docs/api/usage/access-scopes)

此前商品、Blog、运营分析及通用交接修复见[核心修复交接](2026-09-13-opsy-core-repair-handoff.md)。本文件只补充授权生命周期验证，不覆盖或重写前次审计历史。
