# Blog content craft (scenarios, copy, media, tables, links)

Reuse confirmed task context through
[workflow-buyer-decision.md](workflow-buyer-decision.md) before asking the same
scene/FAQ questions again. For any named product, use its verified product URL
and media from the same retained product evidence. Follow the explicit body,
cover and product mappings in [blog-package-contract.md](blog-package-contract.md);
HTTPS, alt text and image counts alone do not establish relevance or ownership.

Use this after a topic is chosen and before Shopify draft approval. Package
fields alone do not make a useful B2B article. Judge readiness on five craft
dimensions: **topic fit**, **body usefulness**, **images**, **tables**, and
**internal links + CTA**.

This is the Blog surface craft gate. The shared buyer, decision, evidence,
objection, boundary, and next-step gate lives in
[workflow-buyer-decision.md](workflow-buyer-decision.md); both gates must pass
before Approval A.

Opsy is **industry-agnostic**. Content jobs below describe buyer jobs for any
B2B inquiry storefront. Do not default to textile/fabric vocabulary (patterns,
gsm, yardage) unless the store profile’s products actually use those terms.

Do not invent search volume, KD, rankings, or opportunity scores. Consume the
validated local data-center queue through [workflow-blog.md](workflow-blog.md);
do not ask the operator to paste analytics rows manually.

Read `profile.merchant_context` for real buyer roles, sales questions,
objections, confirmed commercial facts, restricted claims, and content owner.
These refine scene intake after the data-selected cluster exists. They cannot
replace missing provider-delivered data; missing data returns
`scoring_blocked` before this craft step.

## Store role (before the writer role)

The seller voice describes *how* the store speaks. `profile.store_role`
describes *who it speaks to*: business model, industry, primary audience,
primary market, content language, and conversion goal. Both are needed.

Read `profile.store_role` before topic commitment. Its `business_model` must be
`b2b_inquiry`. If its status is `blocked`, stop and run store-role intake in
[workflow-connection-profile.md](workflow-connection-profile.md). If the store
closes primarily through direct online purchase, route it to Opsy DTC instead
of adapting this B2B Skill.

Use procurement, RFQ, sample, MOQ, and lead-generation framing. Pull the exact
audience, market, language, and CTA from the confirmed profile rather than this
Skill's examples.

This same block also governs Product copy — see
[workflow-product-content.md](workflow-product-content.md).

For buyer questions or factual answers sourced from merchant FAQ material,
read `config/buyer_faq.json` and apply
[buyer-faq-contract.md](buyer-faq-contract.md). Accepted questions matching the
article language, scope, and Blog route may shape the angle or outline. Their
answers remain out of buyer-visible copy unless `content_use: eligible` passes
the separate answer gate; conflicting and quarantined rows remain out.

## Writer role (always first)

Human tone comes from a **configured seller role**, not from the content-job
template. Before outlining or drafting any Blog article:

1. Read `<workspace>/config/store-profile.json` → `profile.content_voice`.
2. If `status` is not `ready`, run **voice intake** (below), save the profile,
   then continue. Do not invent a persona from another store or industry.
3. Internalize the role as a writing prefix for the whole draft. Content jobs
   change structure (table, scene, checklist); they must not replace the human
   voice.
4. Write **as that seller helping a buyer decide**, not as a generic SEO
   article engine or a slogan brand.

### `profile.content_voice` fields

| Field | Purpose |
| --- | --- |
| `status` | `not_started` \| `ready` |
| `role` | One-sentence who is speaking (e.g. experienced product sales for this category) |
| `expertise` | 3–8 concrete competencies buyers expect |
| `buyer_relationship` | Who they usually talk to and what “help” means |
| `tone` | Short adjectives that fit this seller (practical, specific, calm…) |
| `must_do` | Behaviors that make copy feel real |
| `must_not` | Behaviors that make copy feel fake or risky |
| `signature_proof` | Proof angles this seller can use without inventing claims |
| `example_phrasing` | Optional 1–2 sample sentences in their voice |
| `updated_at` | ISO timestamp when the operator last confirmed |

`content_voice` is **optional for connection unlock**, but **required before
Product and Blog draft Approval A**. The same role serves both surfaces.

### Voice intake (one question at a time)

Propose defaults from the enterprise profile questionnaire, then confirm:

1. In one sentence, who is speaking when this store writes Blog for buyers?
2. What do they know deeply (process, specs, sampling, programs…)?
3. Who is the usual buyer, and what are they trying to finish?
4. Which 3 tone words fit? Which 3 words must never appear?
5. What may this seller claim from real experience, and what must stay
   “confirm with us”?

Save answers into `profile.content_voice`, set `status: ready`, and show the
saved block to the operator once before the first draft.

### How the role makes copy more human

- Prefer concrete process language from `expertise` over empty marketing verbs.
- Answer as if continuing a sales chat: next decision, next sample, next RFQ
  field — not a brochure paragraph.
- Keep first-person or direct address consistent with `buyer_relationship`;
  do not switch to encyclopedic third-person mid-article.
- When a fact is outside verified store facts, say it needs confirmation —
  a real salesperson does not invent MOQ or certifications.
- Vary openings and H2 labels across articles; reuse the **role**, not a
  fixed outline skeleton.
- Never narrate the prompt (“As a professional salesperson, I will now…”).
  Just write in that voice.

Industry example shape only (do **not** copy into unrelated stores): a
jacquard-fabric mill store might set `role` to an experienced jacquard sales
specialist who understands development, sampling, and application matching.
A packaging or machinery store must define its **own** role from its catalog.

## Pick one content job

Ask which buyer job this article serves. Choose **one** primary job; other
angles become H2 sections, not a second article type.

Default set (use these first):

| Content job | Plain label | When to use | Body must earn |
| --- | --- | --- | --- |
| `application` | 场景选型 | Buyer picks a product/spec for a real use case or program | Real scene + selection criteria + links to matching collection/PDP |
| `procurement_guide` | 采购/询盘清单 | Buyer asks MOQ, sample, quote fields, inspection, wholesale steps | Checklist or RFQ table + clear inquire next step |
| `comparison` | 对比选型 | A vs B material, model, process, or supplier trade-off | Comparison table + when to pick each |
| `technical` | 规格解读 | Specs, units, performance terms, or terminology before buy | Spec interpretation table or definition block |
| `market_solution` | 行业/客户场景 | A vertical or buyer type (OEM, brand, contractor, distributor…) | Named buyer scenario + path to solution/custom page |

Optional, use sparingly:

| Content job | Plain label | When to use | Body must earn |
| --- | --- | --- | --- |
| `product_roundup` | 产品短名单 | Shortlist of **named live products** for one buying brief | Each item links a real PDP (not only a collection hub) |

Prefer `application`, `procurement_guide`, and `comparison` when the goal is
qualified inquiry. Offer `product_roundup` only when the merchant already has
enough live PDPs and asks for a shortlist; at most about once per content
batch. Do **not** label this job as industry-specific “pattern/lookbook”
language in the default UI.

### Scene intake (ask before writing)

Ask one question at a time; stop when enough to draft:

1. Who is the buyer (role), and what are they trying to finish this week?
2. Which real use scene or program is this for? Name a concrete job (not only
   a category word like “industrial” or “home”).
3. Which 2–4 questions do they usually ask sales before sampling or RFQ?
4. Which live collection, product, or custom/OEM page should this article send
   them to?
5. Which facts need merchant confirmation (MOQ, lead time, price, certs,
   capacity)?

If the operator cannot name a scene or commercial landing, do not draft a
generic encyclopedia post. Help them pick a narrower topic or gather materials
in `inbox/content/` first.

## Five craft dimensions

### 1. Topic fit

- Answers a buyer question or decision, not a keyword costume.
- Does not duplicate an existing article/page for the same job (update or link
  instead).
- Names one commercial target URL that already exists or is approved to create.

### 2. Body usefulness

Write as if answering a serious buyer message, not filling a template.

- First paragraph: direct answer in plain B2B language.
- H2/H3: mostly question-shaped buyer questions from scene intake.
- Separate **verified store facts**, **general industry context**, and
  **merchant-confirmation** items. Never invent MOQ, price, lead time, or
  certifications.
- Prefer concrete nouns from **this store’s** catalog (application, model,
  material, capacity, program type) over filler (“elevate”, “landscape”,
  “delve”, “in today’s fast-paced…”).
- Close with one clear next step tied to the approved primary CTA.

### 3. Images

Text-only is fine for an early brief. **Shopify draft write-ready** needs:

- one featured image (https CDN or store asset) with useful alt;
- at least two inline body images with alt, showing product, application, or
  process — not decorative stock that could belong to any brand;
- media ownership confirmed (operator-supplied or already on the store).

If images are missing, keep the package as local brief / `needs_media` and do
not claim write-ready. Stage files under `inbox/content/` when helpful.

### 4. Tables

Most B2B posts need one useful table. Match the content job:

| Job | Typical table |
| --- | --- |
| `application` | Scene → key specs / selection criteria |
| `procurement_guide` | RFQ fields (qty + unit, key specs, color/finish, sample, ship) |
| `comparison` | Option A vs B across 4–7 decision rows |
| `technical` | Spec term → what it means for buying |
| `market_solution` | Program need → what to confirm with supplier |
| `product_roundup` | Named SKU/handle → fit note + PDP link |

Skip a table only when the piece is a short clarification update and the
operator agrees; say so in the package notes.

### 5. Internal links + CTA

Minimum for write-ready:

- ≥1 link to the primary commercial target (collection, PDP, custom/OEM, or
  solution page);
- ≥1 supporting internal link (related article, second collection, or spec
  page) when it helps the decision;
- exactly one primary inquiry CTA using the store profile’s approved
  `primary_cta` URL/label — do not invent WhatsApp/contact routes;
- no RFQ CTA that silently sends buyers only to a generic contact page when
  the profile defines a stronger primary CTA.

Links must resolve to real storefront paths. Broken or guessed handles block
write-ready.

## Anti-rigidity rules

- Do not force identical H2 labels across every article. Reuse the **jobs**,
  not a copy-paste outline.
- Do not pad word count. A sharp 700–900 word decision piece beats a hollow
  1,800 word essay.
- Do not open with brand slogans or history unless the buyer asked for that.
- Do not create a new “what is …” article when an existing definition page can
  be updated or linked.
- Secondary SEO phrases belong in natural H2/H3 or table cells, not stuffed
  titles.
- Do not import another industry’s jargon from examples in agency packs; pull
  terms from the active store profile and catalog.

## Readiness gate (before Approval A)

Present a short craft scorecard to the operator (pass / fix / blocked):

| Dimension | Pass means |
| --- | --- |
| Store role | `store_role.status: ready` and the article matches its audience and conversion frame |
| Writer role | `content_voice.status: ready` and draft matches role/tone |
| Topic fit | One content job + scene + commercial target named |
| Body | First-paragraph answer + buyer-question H2s + claim labels |
| Images | Featured + ≥2 inline with alt, or explicit `needs_media` |
| Table | Job-matched table present, or justified skip |
| Links + CTA | Commercial target + approved primary CTA verified |

Only packages with store role and writer role ready, and the other dimensions
**pass** (or images marked brief-only and not offered for Shopify write), may
proceed to draft Approval A.
