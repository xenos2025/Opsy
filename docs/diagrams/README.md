# Opsy 架构图与营销素材

2026-09-13 升级后，[主 README](../../README.md) 继续直接展示 `09-opsy-skill-config-dataflow.svg` 组件总图。总图已同步三项核心功能、CLI 实时授权与恢复、线索与可比历史、操作批准、回读及结果交接；Mermaid 图用于展开时序。[客户介绍](../opsy-core-purpose.md) 同步维护面向客户的 UML 时序图。

`09-opsy-skill-config-dataflow` 的 PlantUML、SVG 和 PNG 同步维护。三项核心功能与三个辅助工作流分组展示；服务商套件标为可选上游，Opsy DTC 标为独立分流，不表示 Opsy 运行依赖其他 Skill。01–08 保留为营销/讲解素材，也不替代 Skill 执行规则。

01–08 沿用 terracotta / Claude 文档风：暖底 `#FAF7F2`、强调色 `#C15F3C`、硬门卡 `#F3E6DF`。09 保留原有 UML 组件图配色与框样式，连线统一使用 90° 直角折线（`linetype ortho`），字体使用本机可用的 Microsoft YaHei。修改 09 时须重新生成两种导出格式；Mermaid 补充图直接维护在对应 Markdown 中。

| 图 | 内容 | 定位 |
|----|------|------|
| [主 README](../../README.md) | 三项核心功能、配置与数据、CLI 授权恢复、双批准写入与任务交接 | 当前架构图与 UML 时序图 |
| [客户介绍](../opsy-core-purpose.md) | 服务方、客户、Agent、CLI 和店铺如何协作 | 当前客户版 UML 时序图 |
| [09-opsy-skill-config-dataflow.svg](./09-opsy-skill-config-dataflow.svg) · [PlantUML](./09-opsy-skill-config-dataflow.puml) · [PNG](./09-opsy-skill-config-dataflow.png) | 配置与数据、三项核心功能、CLI 授权恢复、写入门、报告与任务续接 | README 当前组件总图 |
| [01-entry-state-menu.svg](./01-entry-state-menu.svg) | `$opsy` 入口 · 状态机 · 六项主菜单 | 营销/讲解图 |
| [02-project-layout.svg](./02-project-layout.svg) | Skill 通用包 vs 客户工作区核心结构 · SETUP | 营销/讲解图 |
| [03-write-safety.svg](./03-write-safety.svg) | guard → 批准 → execute → check → 回读 | 营销/讲解图 |
| [04-product-publish.svg](./04-product-publish.svg) | 商品进料 · 决策 + craft · 包校验 · Approval A/B | 营销/讲解图 |
| [05-blog-publish.svg](./05-blog-publish.svg) | Blog 声音 · 决策 + craft · 包校验 · 28 天冷却 · A/B 发布 | 营销/讲解图 |
| [06-monthly-data.svg](./06-monthly-data.svg) | 数据更新 · 摘要 · 关键词建议队列 | 营销/讲解图 |
| [07-connection-profile.svg](./07-connection-profile.svg) | 连接前 → CLI → 轻量建档 → 能力拆分 | 营销/讲解图 |
| [08-404-redirect.svg](./08-404-redirect.svg) | 404 分诊 · 仅选中跳转写入 | 营销/讲解图 |

权威执行顺序仍以 `skills/opsy/SKILL.md` 与对应 `references/workflow-*.md`、`state-machine.md`、`safety-and-approvals.md` 为准。

## 重新生成 09

本轮离线生成使用已有 PlantUML 1.2024.8、Graphviz 2.44.1 和 Java 8，输入编码显式设为 UTF-8。这些仅为图示开发工具，不是客户运行 Opsy 的依赖。以下命令从仓库根目录运行，`<plantuml.jar>` 替换为本机已审核的 jar 路径，Graphviz 通过 `GRAPHVIZ_DOT` 指向本机可执行文件：

```text
java "-Dfile.encoding=UTF-8" -jar <plantuml.jar> -charset UTF-8 -checkonly docs/diagrams/09-opsy-skill-config-dataflow.puml
java "-Dfile.encoding=UTF-8" -jar <plantuml.jar> -charset UTF-8 -tsvg docs/diagrams/09-opsy-skill-config-dataflow.puml
java "-Dfile.encoding=UTF-8" -jar <plantuml.jar> -charset UTF-8 -tpng docs/diagrams/09-opsy-skill-config-dataflow.puml
```

交付前检查中文、组件名称、连线方向和本地引用，并同步 README 与 CHANGELOG。使用不同渲染器或字体可能改变布局，应重新检查导出图。

## 重新生成 01–08

重新生成 01–08 SVG（须用 Python 写 UTF-8；直接保存 `.svg` 可能损坏中文）：

```bash
python docs/diagrams/_gen_diagrams.py
```

## 外部工作流参考资料

- [GRC Blog 内容生产系统 UML 全景图](references/grc-blog-content-system/README.md)：2026-09-13 从知识库归档，含 SVG、PNG、可缩放查看页和可独立编译的 PlantUML。用于 Opsy 设计研究，不替代 Opsy 的当前实现与执行规则。
