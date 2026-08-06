---
status: accepted
---

# 用共享建议队列把交付数据路由到 Product 与 Blog

Opsy 从服务方整理并交付的 `data-center/` 读取月度快照。有效的
`gsc_queries` 是需求证据基础；可选的 `gsc_query_page` 用于识别查询
已经由哪个站内页面承接，`ga4_landing_pages` 只补充该落地页的访问和
互动佐证。

系统生成一个共享 `keyword-suggestions-YYYY-MM.csv`，把每条查询标记为
`product`、`blog` 或 `review`，并保留建议动作、已有页面、数据周期、
证据引用和人工决定字段。已有 Product/Collection 查询优先回到商品流程，
已有 Blog 查询优先更新文章，Page/Home 意图保持人工保护，未承接的问句
才可能进入 Blog 候选。

所有行初始状态为 `suggested`。队列不依赖 Ads planner，不生成伪造的
volume/KD/opportunity 分数，不自动选题，不自动改写，也不授权 Shopify
写入。Product 与 Blog 仍须完成事实匹配、重复检查、买家决策简报、各自
工艺检查和明确批准。

## Consequences

- Opsy 保持一个轻量数据入口，不复制服务商的深度关键词打分 Agent。
- GSC/GA4 只能说明观察到的需求和落地表现，不能证明产品能力、认证、
  商业条款或买家结果。
- 缺少 `gsc_queries` 时建议生成失败关闭；其他 GA4/GSC 数据集保持可选。
- 派生建议文件放在 `outputs/monthly/`，不写回 manifest 或原始 data-center。
