# 企业画像问卷合同

这是 `site-foundation` 在 Opsy B2B 中唯一保留的部分。它帮助企业主、销售和基础运营提供 Product、Blog 和每周行动所需的经营事实，不生成技术报告。

## 问法

一次只问一个必要问题。先说明为什么要问，再给一个可修改的答案示例。把“已确认”“待确认”“来源”分开记录，不要从网站名称、图片或行业惯例推断答案。

## 必填画像

| `profile.merchant_context` 字段 | 要确认的事实 |
| --- | --- |
| `product_families` | 主营产品线或服务类型 |
| `buyer_roles` | 谁发起、影响或批准采购 |
| `sales_questions` | 销售最常收到的真实问题 |
| `purchase_objections` | 哪些问题会阻止样品、报价或询盘 |
| `confirmed_commercial_facts` | 已确认的 MOQ、交期、样品、定制或报价规则；不确定的不要写入 |
| `restricted_claims` | 没有文件时不能声称的认证、性能、结果或合规内容 |
| `product_owner` | 谁确认商品事实 |
| `content_owner` | 谁确认 Blog 主题和正文 |
| `publication_approver` | 谁批准 Shopify 发布 |
| `updated_at` | 企业主最后确认时间，ISO 时间戳 |

同时确认 `profile.store_role` 和商品/Blog 共用的 `config/content_voice.json`。语气来源与旧档案兼容见 [content-voice-contract.md](content-voice-contract.md)，档案字段见 [workflow-connection-profile.md](workflow-connection-profile.md)。所有业务字段确认后，把 `merchant_context.status` 设为 `ready`。

## 用户画像 HTML 工具

企业主希望分步骤填写时，使用本地工具，不另外创建长期配置文件：

```text
node <skill-root>/scripts/opsy.mjs audience-wizard --json
```

按 [audience-intake-contract.md](audience-intake-contract.md) 保存并校验
`inbox/profile/<日期>/audience-intake.json`。只有企业主/销售负责人确认的
摘要进入 `profile.store_role.primary_audience`、`secondary_audiences`、
`audience_status` 和 `audience_intake_path`。`research_draft` 可以帮助规划，
但不能让 Product/Blog 获得写入就绪。

## Blog 数据交付问题

在确认主询盘 CTA 时同时确认按钮文字与实际 HTTPS 目标地址，保留
`profile.primary_inquiry_cta`，并补充 `profile.inquiry_cta.url`、
`confirmed_at`、`evidence_ref`。接收询盘的外部地址也须明确确认。
不要由按钮文字推测联系页；旧画像缺少地址时保留原值并补问。

只问：“服务方是否已经把数据包放到本地工作区？”如果没有，记录
`not_delivered`。商品资料工作可以继续；Blog 标记 `scoring_blocked`，等待服务方
交付；如果已有 accepted FAQ questions，可走明确标注、无搜索指标的
`faq_seeded` 冷启动。不要询问 Google API、OAuth、Property ID、Service
Account 或凭据。

## 明确不做

- Tracking 或转化事件验收；
- Core Web Vitals / Lighthouse 性能报告；
- Schema.org 或 Shopify 结构化数据验收；
- 主题代码、索引、抓取或技术 SEO 审计；
- 要求企业主自行配置 GA4/GSC API。

这些需要技术人员或服务方。Opsy 可以记录“需要服务方处理”的一项行动，但不能把它伪装成企业主可执行的报告。
