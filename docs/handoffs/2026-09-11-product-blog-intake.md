# 产品资料导入与 Blog 优化交接

日期：2026-09-11。时区：Asia/Shanghai。

依据：本任务隔离 worktree 的实际代码、源头仓库只读文件、Node 自动化测试和安装器 dry-run。没有使用客户数据、真实供应商页面或真实店铺写入结果作为验收依据。

## 工作位置与范围

- 分支：`codex/product-blog-intake`。
- 工作区：`C:\Users\showu\.codex\worktrees\9e2d\Opsy`。
- Opsy 起点：`1ea691f`；方法源头只读核对：`87cb85a`。开始时两个工作区均无未提交修改。
- 本轮仅实现产品资料入口、产品包/批次校验、Blog 资料复用和配图映射。版本仍为 `0.1.0`，未进行 release、提交或推送。
- 唯一 Skill 仍是 `skills/opsy/`；未修改 Shopify GraphQL、写入 guard、全局配置或已安装 Skill/插件。

## 已实现

1. `product-table.mjs`：Node built-ins 解析 UTF-8 CSV 和普通 `.xlsx`，支持工作表选择、表头行选择、精确列映射、共享/内联字符串及 SKU 原始文本；ZIP 限额和 CRC 校验，公式/错误行独立阻断。
2. `product-intake.mjs`：表格、图片、1688 和 Alibaba 浏览器采集文件统一进入产品 inbox；保留源 URL、工作表/行、资料、SKU/规格分组、图片归属及来源。访问受限保留待补充状态。每项事实和媒体需要商家确认；指纹变化失效，本地图片文件变化或丢失在包验证时阻断。
3. `opsy.mjs`：接入检查表格、导入资料、检查 intake、生成待写作商品包、批次包校验、选择内容上下文、生成 Blog 本地预览。用户通过自然语言交互，映射/证据/包文件由 Agent 生成。
4. `merchant-packages.mjs`：导入包校验 SKU、确认状态、价格及媒体顺序；批次中无效文件、重复 ID/SKU/handle 不阻断无关合格候选。保留精确候选选择和独立批准。
5. `content-reuse.mjs`：只复用当前任务精确系列/市场/语言范围内的已确认画像和 FAQ 问题；保留来源路径、指纹、字段指针以及实际简报/正文片段。未确认或歧义受众不自动使用，不携带未批准答案。
6. `blog-media.mjs`：核对独立产品证据、标识/handle/URL、正文产品链接、媒体 ID/URL/来源及图片位置；封面和正文插图都有来源、权利及视觉相关性确认。检查正文实际包含内部链接和 CTA，输出带校验状态的沙箱预览文件。
7. 同步文档中的 FAQ 冷启动规则。Product 草稿允许一个 FAQ 加明确 caveat，公开包仍至少两个。旧 Blog 包可本地审阅，写入前须补齐图片映射。

入口说明见：

- `skills/opsy/references/workflow-products.md`
- `skills/opsy/references/product-package-contract.md`
- `skills/opsy/references/workflow-buyer-decision.md`
- `skills/opsy/references/blog-package-contract.md`

## 本轮验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | 94/94 通过，无跳过 |
| `npm run validate` | 通过，21 个直接引用，版本/分发残留检查通过 |
| `python -X utf8 <skill-creator>/scripts/quick_validate.py skills/opsy` | 通过 |
| `install.ps1 -Source <worktree>/skills/opsy -TargetHost Both ... -DryRun` | Codex/WorkBuddy 均通过，无文件改变 |
| `install.sh --host both ... --dry-run` | Codex/WorkBuddy 均通过，无文件改变 |
| `git diff --check` | 通过 |

Windows PowerShell 的安装器默认参数环境需要显式传入 `-Source`；Git Bash 在该沙箱下需要进程内 `PATH=/usr/bin:/bin` 才能找到 coreutils。两项均通过显式参数/进程环境完成，未修改安装器或全局环境。

测试证据位于 `tests/product-intake.test.mjs`、`tests/merchant-packages.test.mjs`、`tests/audience-intake.test.mjs` 及原有 workspace/guard 测试。XLSX 使用真实 ZIP/OOXML 字节合成夹具；不是客户 Excel 或真人图片语义验收。

## 仍需真实资料验收的边界

以下是支持边界，不是已验证的客户结果：

- 链接入口依赖宿主可用浏览器/读取工具。没有自动爬虫或登录适配器。尚未使用真实 1688/Alibaba 商品页面验收；登录、验证码和不可访问页面应转为截图/导出/粘贴资料补充。
- 表格支持 UTF-8 CSV、普通未加密 `.xlsx`，每文件 16 MiB、20,000 行，XLSX 至多 1,024 列。旧 `.xls`、`.xlsm`、合并单元格、密码、公式执行、显示格式恢复和嵌入图片提取不在支持范围。用文本 SKU 列保留前导零。
- 多 SKU 规格组会保留对应关系；当前单 variant 包不能自动发布多 variant 产品。只有商家确认分别建商品时才准备独立包，不能为了通过校验强拆产品。
- 店铺查重只验证提供的本地快照；创建前仍需实际店铺重复项核对。`ready_for_copy` 和 `passedIds` 都不代表 Shopify 批准。
- 产品事实、供应商承诺、图片权利和真实主体对应仍需有来源的商家/Agent 视觉语义确认。静态指纹和映射检查不证明照片内容、当前外部 URL 状态或事实真伪。
- Blog 预览生成和沙箱标记已自动化验证；没有做真实站点渲染、真人视觉或 Shopify 草稿/发布验收。
- 下次真实试用建议提供一份带 SKU/规格/图片列的 Excel、一个供应商商品链接和一个待写 Blog 商品范围，先做本地预览。任何店铺写入仍走原来的精确批准、备份、响应校验和同通道回读。
