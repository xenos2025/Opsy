# Opsy 客户交付与上手指南

服务方交付 **Opsy Skill 目录或 GitHub 项目，以及已经做好的客户项目压缩包**，带客户在 Codex 或 WorkBuddy 中安装、打开项目并完成第一次使用。

客户只需接收文件、登录应用、跟着操作。交付信息由服务方预填在[一页交付卡](templates/customer-handover/客户交付卡.md)，不用客户重新填企业资料、技术参数或多份签收表。

修订：2026-09-15，Asia/Shanghai。安装说明依据本仓库安装器及文中官方文档；客户电脑的实际可用性在首次带教时检查。

## 1. 我们交付什么

| 交付物 | 服务方准备 | 客户怎么用 |
| --- | --- | --- |
| Opsy Skill（二选一） | 完整 `opsy/` 目录，或 [Opsy GitHub 项目](https://github.com/xenos2025/Opsy)及本次提交 / 版本；仓库中的 Skill 位于 `skills/opsy/` | 安装到 Codex 或 WorkBuddy |
| 已做好的客户项目 ZIP | 现有项目的规则、配置、产品素材、内容、已交付数据和已有成果 | 解压到固定目录，日常在应用中打开它 |
| 本指南 + 一页交付卡 | 预填下载位置、项目目录名、所用应用和支持联系人 | 跟着安装，有问题知道找谁 |

**Skill 是工具；项目 ZIP 是客户自己的工作资料。两份都要交。** GitHub 上的 Opsy 源码不能代替客户项目包。

服务方打包时保留已有 `AGENTS.md`、`shopify-ops.json` 及其指向的完整工作区，包含已有画像、素材和成果；不让客户从空模板重建。被 Git 忽略但需要交付的资料也要纳入项目 ZIP。包内不放账号密码、API Key、Cookie、CLI 登录凭据或宿主运行目录；Skill 与客户项目分别存放，客户包通过双方约定的私密渠道发送。

## 2. 先准备电脑和文件

1. **选一个应用即可。** 安装并打开客户选用的 Codex 或 [WorkBuddy](https://www.workbuddy.cn/)，由客户在应用内完成自己的账号登录，确认能正常对话。下载与登录入口以官方页面和当前客户端为准。
2. 下载项目 ZIP，解压到固定目录，例如 `D:\客户项目\运营项目`。实际打开的是包含 `AGENTS.md`、`shopify-ops.json` 的项目根目录。已有同名项目时解压到新目录核对，避免覆盖正在使用的资料。
3. 取得完整 `opsy/` Skill 目录。若收到 GitHub 链接，服务方指明本次提交对应的源码包，下载解压后取出 `skills/opsy/`；客户无需学习 Git 命令。
4. 服务方协助检查 Node.js ≥ 22.12 和 Shopify CLI。缺少时按[运行环境说明](../README.zh-CN.md#安装与更新)补齐并核验；Skill 安装器只安装 Skill，不会安装这些运行环境。客户不用填写环境版本表。

## 3. 安装到所选应用

### 使用 Codex

1. 将完整 `opsy` 文件夹放到当前用户的 `.agents/skills/` 下。Windows 可在文件资源管理器地址栏输入 `%USERPROFILE%\.agents\skills`；目录不存在时新建。macOS / Linux 对应 `~/.agents/skills/`。
2. 检查最终结构为 `.agents/skills/opsy/SKILL.md`，并保留同目录下的 `scripts/`、`references/`、`assets/` 等全部文件。已有 `opsy` 时由服务方核对并备份后更新。
3. 重新打开应用或开始新任务，确认能找到 `opsy`。在应用中打开解压后的**客户项目文件夹**，进入本地任务，再执行下一节的首次检查。

本步骤采用 [OpenAI 官方 Skill 文档](https://learn.chatgpt.com/docs/build-skills)列出的用户目录。当前仓库安装器默认使用 `.codex/skills`；服务方若使用安装器，可显式指定本文目录。Windows 在 Opsy 仓库根目录执行：

```powershell
.\install.ps1 -Host Codex -CodexSkillsRoot "$env:USERPROFILE\.agents\skills" -DryRun
.\install.ps1 -Host Codex -CodexSkillsRoot "$env:USERPROFILE\.agents\skills"
```

第一条只预览，第二条确认后安装。只收到 Skill 文件夹时使用上面的复制方式即可，不需要安装器。

### 使用 WorkBuddy

1. 打开“技能”，选择“添加技能 / 上传技能”，导入服务方准备的 Opsy 本地技能包。若只收到目录或 GitHub 源码，由服务方将完整 `opsy/` 整理为技能 ZIP；不要上传客户项目 ZIP。
2. 在“已安装”中找到并启用 `opsy`。按 [WorkBuddy 官方技能说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)完成导入；具体按钮名称以当前客户端为准。
3. 新建本地任务，将工作目录选为解压后的**客户项目文件夹**，选择 Opsy 技能，执行下一节的首次检查。

服务方也可使用本仓库 WorkBuddy 安装器，Windows 在 Opsy 仓库根目录执行：

```powershell
.\install.ps1 -Host WorkBuddy -DryRun
.\install.ps1 -Host WorkBuddy
```

安装器默认目标为当前用户 `.workbuddy/skills/opsy`，设置 `WORKBUDDY_HOME` 时随之调整。安装后仍需在客户客户端确认识别；界面导入与安装器选一种即可。

## 4. 带客户完成第一次使用

在客户项目的新任务中选择已安装的 Opsy，然后复制这段话：

```text
使用 Opsy 检查这个已交付的客户项目。沿用现有 AGENTS.md、shopify-ops.json、配置和资料，不重新初始化。先告诉我项目位置、目标店铺、已有材料和下一步；检查运行环境，说明还需要我完成哪些登录或授权。先不修改店铺内容。
```

Codex 支持技能提及时可用 `$opsy`，其他界面从技能选择器选 Opsy 即可。服务方带客户核对项目和店铺，协助完成所需 Shopify 登录与授权，再选择**一项**练习：整理一份产品材料、准备一篇 Blog，或查看已交付数据。先展示方案和结果位置，客户需要写入草稿或发布时再确认具体操作。授权登录不等于同意发布内容。

结束时让客户独立完成三件事：

- 关闭并重新打开客户项目，找到 Opsy。
- 发出一个实际需求，并打开生成的预览或报告。
- 找到上次结果，用“使用 Opsy 继续上次未完成的任务，先告诉我当前进度”接着工作。

上述步骤完成即可结束安装上手交接。未解决的问题由服务方在交付卡留一句待办；一次练习通过不代表所有店铺写入功能都已实测。

## 5. 客户以后怎么用

每次打开同一个客户项目，选择 Opsy，直接说需求：

- “帮我整理这批产品资料，先给我看上架方案和缺少的信息。”
- “根据项目已有资料，给我几个 Blog 选题，我选好后再写。”
- “分析服务方交付的这份数据，告诉我接下来优先做什么。”

业务资料已经在项目中，只有变化或缺少时才补充。Google 数据由服务方交付本地数据包，客户无需配置 Google API。换电脑时重新安装应用和 Skill，复制完整客户项目，按需重新登录授权；更新 Opsy 只更新 Skill，保留客户项目。下载了新源码还需更新宿主中的安装副本，同版本更新由服务方按 [README 的 Force 流程](../README.zh-CN.md#安装与更新)处理。

遇到问题，向交付卡上的联系人提供操作目标和脱敏错误提示即可。
