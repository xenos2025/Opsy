# Opsy 架构图与营销素材

`09-opsy-skill-config-dataflow` 是主 README 展示的完整技术架构图，包含 PlantUML 源文件、SVG 和 PNG 截图。01–08 保留为营销/讲解图，可用于网站、社交媒体、提案或演示；它们帮助解释单个卖点，但不替代 Skill 的执行规则。

01–08 沿用 terracotta / Claude 文档风：暖底 `#FAF7F2`、强调色 `#C15F3C`、硬门卡 `#F3E6DF`，只维护 SVG。09 使用 UML 组件图视觉语言，并同时维护源文件与两个导出格式。

| 图 | 内容 | 定位 |
|----|------|------|
| [09-opsy-skill-config-dataflow.svg](./09-opsy-skill-config-dataflow.svg) · [PlantUML](./09-opsy-skill-config-dataflow.puml) · [PNG](./09-opsy-skill-config-dataflow.png) | Skill 链接、配置来源、证据、内部工作流、写入门与回读 | README 技术总图 |
| [01-entry-state-menu.svg](./01-entry-state-menu.svg) | `$opsy` 入口 · 状态机 · 六项主菜单 | 营销/讲解图 |
| [02-project-layout.svg](./02-project-layout.svg) | Skill 通用包 vs 客户工作区核心结构 · SETUP | 营销/讲解图 |
| [03-write-safety.svg](./03-write-safety.svg) | guard → 批准 → execute → check → 回读 | 营销/讲解图 |
| [04-product-publish.svg](./04-product-publish.svg) | 商品进料 · 决策 + craft · 包校验 · Approval A/B | 营销/讲解图 |
| [05-blog-publish.svg](./05-blog-publish.svg) | Blog 声音 · 决策 + craft · 包校验 · 28 天冷却 · A/B 发布 | 营销/讲解图 |
| [06-monthly-data.svg](./06-monthly-data.svg) | 数据更新 · 摘要 · 关键词建议队列 | 营销/讲解图 |
| [07-connection-profile.svg](./07-connection-profile.svg) | 连接前 → CLI → 轻量建档 → 能力拆分 | 营销/讲解图 |
| [08-404-redirect.svg](./08-404-redirect.svg) | 404 分诊 · 仅选中跳转写入 | 营销/讲解图 |

权威执行顺序仍以 `skills/opsy/SKILL.md` 与对应 `references/workflow-*.md`、`state-machine.md`、`safety-and-approvals.md` 为准。

重新生成 01–08 SVG（须用 Python 写 UTF-8；直接保存 `.svg` 可能损坏中文）：

```bash
python docs/diagrams/_gen_diagrams.py
```
