# Product description craft (voice, structure, FAQ, media order)

Use this after product facts are collected and before Shopify draft approval.
Filled fields do not make a useful PDP. A description that only lists specs and
FAQs reads like a catalog export and gives a buyer no reason to inquire.

This is the Product surface craft gate. The shared buyer, evidence, objection,
boundary, and next-step gate lives in
[workflow-buyer-decision.md](workflow-buyer-decision.md); both gates must pass
before Approval A.

Opsy is **industry-agnostic**. Pull every noun from the active store profile and
catalog. Do not import textile, wall-panel, or any other vocabulary from agency
example packs.

Read `profile.merchant_context` before drafting. Use its confirmed product
families, buyer roles, sales questions, purchase objections, commercial facts,
and restricted claims. A `ready_with_gaps` context does not authorize guessing;
name the missing owner fact in the package and ask one question at a time.

## Expression order (required)

```text
verified product facts (+ optional demand evidence)
  → buyer decision brief
  → store role + content_voice (seller role)
  → structure (this file)
  → descriptionHtml
```

Never jump from a fact list straight to `descriptionHtml`. Record which voice
was applied in the product package:

- `store_role.status` and the required `store_role.business_model: b2b_inquiry` from
  `<workspace>/config/store-profile.json`;
- `content_voice.status` and `content_voice.role`.

If `store_role.status` is `blocked`, stop and run store-role intake from
[workflow-connection-profile.md](workflow-connection-profile.md). If
`content_voice.status` is not `ready`, run voice intake from
[workflow-blog-content.md](workflow-blog-content.md) — the same seller role
serves Blog and PDP. Do not invent a persona from another store.

The status helper reports both as `write_capabilities.products.missing` entries.

## Opening paragraph

The first paragraph carries the brief's `primary_answer` and `buyer_value` **in
the configured seller voice**, not an SKU restatement.

- Name what the product is (type or form, material or construction when known)
  and its primary buyer application.
- Say why that matters for the decision the buyer is making right now.
- Keep person and tone consistent with `content_voice`. When the role speaks as
  the seller, write as the seller.
- Include only merchant-confirmed commercial terms. Unknown terms stay out of
  the opening and remain in the brief's unresolved items.

A spec-only opening (`Model X-200. 304 stainless. MOQ 500.`) fails this gate
when `content_voice.status` is `ready`.

## Structure

Treat the blocks below as a component library, not a mandatory order. Each block
should do one decision job. Omit or merge a block when a Shopify field, a
metafield, or the theme already does that job.

| Block | Decision job | Notes |
| --- | --- | --- |
| Opening paragraph | answer + value | Required. See above. |
| Specifications list | proof | Only verified facts; label units. |
| Recommended applications | scene | Name real uses; state the fit boundary. |
| Common questions | friction | 2–3 buyer questions. See FAQ rules. |
| Closing next step | action | What the buyer provides and receives. |

Do not reuse an identical H2 sequence across every product. Reuse the **jobs**,
not a copy-paste skeleton.

## FAQ rules

Prefer accepted, scope-matched `pdp` question signals from
`config/buyer_faq.json`; follow
[buyer-faq-contract.md](buyer-faq-contract.md). A `question_only` row may shape
the question without authorizing its draft answer. Reuse answer text as a fact
only when `content_use: eligible`; otherwise use verified Product facts or ask
the owner/sales role to confirm the missing commercial fact.

- Use 2–3 questions for a product offered for publication. One is acceptable for
  a draft when material is thin; record `sourceFacts.faqCaveat`. Draft validation
  warns; public validation still requires at least two.
- Keep the section heading as `<h2>` (for example `Common Questions`) in the
  store's content language.
- Write each question as a bold paragraph, not a heading:
  `<p><strong>Question?</strong></p>` followed by a short answer paragraph.
  Do not use `<h3>` or `<h4>` for question lines unless the operator has
  reviewed how the active theme styles them.
- Keep answers specific to this product's verified facts. Do not add generic
  industry claims to fill space.

Pick questions the buyer actually asks before sampling or ordering:

- what this product is best used for;
- MOQ and lead time;
- sample or option confirmation before bulk;
- the full option or colour list when the line has several;
- what the buyer should provide for accurate pricing.

## Commercial fact guardrails

Never infer these from images, filenames, or a similar product. Use the exact
fallbacks when a fact is unconfirmed.

| Fact | When unconfirmed |
| --- | --- |
| Lead time | Write that lead time depends on order quantity and options. |
| Price | Use an indicative or from-price only when the operator confirms it; otherwise omit. |
| MOQ | Omit and keep it in the brief's unresolved items. |
| Certifications, ratings, compliance | Leave blank. Never imply a certificate the store cannot document. |
| Stock or delivery dates | Omit. Do not promise availability. |
| Performance, sustainability, capacity | Omit unless a named document supports it. |

If application imagery was generated rather than photographed, record it as a
concept image in the local package notes only. Never present it as a finished
customer installation.

## CTA belongs to the theme

The PDP inquiry route comes from `profile.primary_inquiry_cta` and the theme's
primary button.

- Do not hardcode a contact page, WhatsApp link, form URL, email address, or
  phone number into `descriptionHtml`.
- Closing copy may say what the buyer should send and what response to expect,
  and point at the on-page inquiry button without inventing its URL.

## Media order

The first media a buyer sees decides whether they keep reading.

- First media must be a front overview of the product itself.
- A video, a plain colour or material chip, an extreme macro detail, a label or
  ruler shot, or an application scene must not take the first position when a
  front overview exists.
- Never relabel a swatch or detail crop as the front overview. Ask the operator
  which file is the front view when it is ambiguous.
- When no front overview exists, keep the product as a draft, record the media
  gap in the package notes, and ask the operator for one before offering
  Approval B.

## Readiness gate (before Approval A)

Show the operator a short scorecard (pass / fix / blocked):

| Dimension | Pass means |
| --- | --- |
| Store role | `store_role.status` is `ready` and `business_model` is `b2b_inquiry` |
| Seller voice | `content_voice.status: ready` and the opening reads in that role |
| Opening | Primary answer plus buyer value, not a spec restatement |
| Structure | Specs, applications, and a next step each do their own job |
| FAQ | 2–3 buyer questions as bold paragraphs with specific answers |
| Facts | Unconfirmed commercial terms omitted or using the stated fallback |
| CTA | No hardcoded inquiry route in the body |
| Media | Front overview first, or an explicit media gap kept as draft |

Only packages with store role and seller voice ready, and the other dimensions
passing, may proceed to Approval A. A media gap keeps the product at draft and
blocks Approval B.
