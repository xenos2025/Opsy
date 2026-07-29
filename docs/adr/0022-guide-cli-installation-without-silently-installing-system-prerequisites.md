# 引导安装 Shopify CLI，不静默安装 Node 或 Git

安装向导检测 Node、包管理器、Git、Shopify CLI 及版本。Node 或 Git 不满足 Shopify 官方要求时，向导显示缺失项与平台对应的安装指引，但不静默修改系统；前置条件满足而 Shopify CLI 缺失时，向导展示套组支持的固定版本安装命令，并可在运营者明确确认后执行。

已有 CLI 不盲目升级，只检查支持范围。店铺授权使用带明确最小 scopes 的交互式 `shopify store auth`；授权后运行只读店铺身份与权限检查，不用测试写入制造对象。日志不得保存 token、cookie 或授权响应中的秘密。
