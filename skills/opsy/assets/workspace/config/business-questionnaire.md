# 企业画像问卷

Status: not started

只记录企业主、销售或基础运营可以确认的经营事实。本问卷不做 Tracking、
Core Web Vitals、结构化数据或其他技术验收。

## 企业与商品

- Brand:
- B2B offer and main product families:
- Target markets:
- Target languages:

## 买家与销售现场

- Buyer roles:
- Secondary buyer roles:
- Audience review status (`research_draft` / `merchant_confirmed` / `data_revised`):
- Dated audience intake path (optional):
- Common sales questions:
- Purchase objections:
- Information buyers must provide before quote/sample follow-up:

## 已确认边界

- Confirmed commercial facts:
- Claims that must not be made without documents:
- Primary inquiry CTA:
- Product owner:
- Content owner:
- Publication approver:
- Operating restrictions:

## Blog 所需的服务方数据交付

- Local snapshot delivery route:
- Latest delivered period:
- Evidence files:

企业主无需配置 Google API。只有服务方已交付到本地工作区的数据包，才能作为
GA4/GSC 数字判断依据；新站可用 `buyer_faq.json` 中已接受的 Blog 问题走明确
标注、无搜索指标的 `faq_seeded` 冷启动。两种证据都不可用时 Blog 保持
`scoring_blocked`。

需要分步骤整理买家画像时，使用 Opsy 本地 HTML 工具。完整明细保存到
`inbox/profile/<日期>/audience-intake.json`；这里只记录确认摘要，不增加新的
长期配置文件。

## Assumptions awaiting confirmation

- None.

## 来源

- Operator-provided facts:
- Shopify Admin-verified facts:
- Provider-delivered local files:
