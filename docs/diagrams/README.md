# Opsy 流程说明图

视觉语言与参考图一致（terracotta / Claude 文档风）：暖底 `#FAF7F2`、强调色 `#C15F3C`、硬门卡 `#F3E6DF`。只维护 SVG，不生成 PNG。

| 图 | 内容 | 类型 |
|----|------|------|
| [01-entry-state-menu.svg](./01-entry-state-menu.svg) | `$opsy` 入口 · 状态机 · 六项主菜单 | 架构总览 |
| [02-project-layout.svg](./02-project-layout.svg) | Skill 通用包 vs 客户工作区 · SETUP | 部署 |
| [03-write-safety.svg](./03-write-safety.svg) | guard → 批准 → execute → check → 回读 | 安全阶梯 |
| [04-product-publish.svg](./04-product-publish.svg) | 商品进料 · 决策简报 · Approval A/B | 工作流 |
| [05-blog-publish.svg](./05-blog-publish.svg) | Blog 声音 · 决策 + craft · A/B 发布 | 工作流 |
| [06-monthly-data.svg](./06-monthly-data.svg) | 数据更新 · 摘要 · 关键词建议队列 | 数据流 |
| [07-connection-profile.svg](./07-connection-profile.svg) | 连接前 → CLI → 轻量建档 → 能力拆分 | 就绪阶梯 |
| [08-404-redirect.svg](./08-404-redirect.svg) | 404 分诊 · 仅选中跳转写入 | 工作流 |

权威执行顺序仍以 `skills/opsy/SKILL.md` 与对应 `references/workflow-*.md`、`state-machine.md`、`safety-and-approvals.md` 为准。

重新生成 SVG（须用 Python 写 UTF-8；直接保存 `.svg` 可能损坏中文）：

```bash
python docs/diagrams/_gen_diagrams.py
```
