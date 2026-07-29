# 复用同一套 Skill，并以 Shopify CLI Store 通道执行店铺写入

首版使用同一套可移植 Skill 同时适配 Codex 与 WorkBuddy；这一兼容结论以项目发起人的实际测试为依据。完整安装必须包含 Shopify CLI，并使用 `shopify store auth` 建立目标店铺认证，再通过 `shopify store execute` 执行 Admin GraphQL 查询与 mutation；主题操作使用 `shopify theme` 命令。产品、Blog 文章与 metafield 的自动操作属于产品核心能力，不能继续依赖旧包中未随包交付的客户端 uploader。所有 mutation 仍须经过精确预览、用户批准、显式写入开关和同通道回读。

这项选择以“可直接执行”为优先，接受 CLI 安装与店铺授权带来的首次配置成本。安装向导、诊断和错误恢复必须把这些技术步骤翻译成运营者可理解的操作，不要求运营者自行编写 GraphQL 或管理明文凭据。

CLI 尚未安装、目标店铺尚未认证或读写预检尚未通过时，产品状态统一为“店铺连接未完成”。该状态只允许业务问卷与公开站点检查；不得运行 Admin、主题、数据、metafield 或其他内部审计，也不得进入任何写入流程。公开检查的结论只能描述公网可观察事实，不能推断后台状态。
