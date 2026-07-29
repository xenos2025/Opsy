# Opsy — Guided Shopify Operations

中文名：**Opsy Shopify 引导式运营助手**

Opsy 是面向 Shopify 初学者和兼职运营者的单入口 Skill，兼容 Codex 与 WorkBuddy。它主要服务 B2B 询盘站，引导完成运营周报、商品运营、Blog 与内容、404 处理、上月数据和店铺连接/建档。

“操作简单”不代表取消安全控制。Opsy 在连接前只允许业务问卷和公开站点检查；连接后必须先完成轻量店铺建档；所有 Shopify 写入都要经过预览、明确批准、执行和同通道回读。

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

## 项目兼容

- 全新项目：默认创建 `shopify-ops/` 和根目录 `shopify-ops.json`。
- 已有仓库：读取定位文件并沿用现有工作区，包括 `_project/`。
- 只有 `_project/`、没有定位文件：先预览，再选择是否只补定位文件。
- 已有 `AGENTS.md` 永不覆盖。

## 仓库结构

```text
skills/opsy/       可分发的唯一主 Skill
tests/             状态、数据、写入保护和契约测试
docs/adr/          产品决策记录
install.ps1        Windows 双宿主安装器
install.sh         macOS/Linux 双宿主安装器
```

Skill 内只包含项目无关的说明、工具和模板，不包含客户数据。

## 卸载

```powershell
.\uninstall.ps1 -Host Both
```

```bash
./uninstall.sh --host both
```

卸载采用可恢复归档，只处理共享 `opsy` Skill，不扫描或删除客户工作区。

## 官方平台依据

Opsy V1 于 2026-07-29 按 Shopify 官方 [CLI 要求](https://shopify.dev/docs/api/shopify-cli)、[Store 认证](https://shopify.dev/docs/api/shopify-cli/store/store-auth)、[Store execute](https://shopify.dev/docs/api/shopify-cli/store/store-execute) 和 [Admin GraphQL 2026-07](https://shopify.dev/docs/api/admin-graphql/2026-07) 完成校验。所有 GraphQL 模板已通过 Shopify 官方 schema 验证器。
