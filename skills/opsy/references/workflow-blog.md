# Workflow: Blog 与内容

Blog quality is not “fields filled”. Guide the operator through topic → scene →
draft craft → package → dual-approval write. Load
[workflow-blog-content.md](workflow-blog-content.md) before drafting body copy.

## 1. Choose an entry

Offer:

1. **Data-recommended topics**: use the latest valid monthly snapshot and
   current site content; show the data period, evidence, duplication check, and
   no more than three candidates. Recommend a content job for each candidate
   from [workflow-blog-content.md](workflow-blog-content.md) (do not invent
   volume/KD/opportunity scores). Preview `suggest-keywords`; consider only
   `route_hint: blog` plus relevant `review` rows after checking the mapped
   owned page. Do not consume `route_hint: product` as a new Blog topic.
2. **Merchant-directed topic or materials**: use the supplied question, brief,
   product facts, or media from chat / `inbox/content/`. Do not invent search
   volume, ranking, or opportunity scores.

If data is missing or stale, default to merchant-directed and say so.

When a candidate points at an owned Blog URL, check the rewrite cooldown in
section 8 before offering it as an update. Do not recommend rewriting a URL that
was materially updated within the last 28 days just because its metrics have not
moved.

## 2. Load store role and writer role from the store profile

Before any outline or body draft, read `<workspace>/config/store-profile.json`.

First confirm `profile.store_role.status` is `ready`. Its business model,
industry, primary audience, primary market, content language, and conversion
goal decide who the article speaks to and what the next step is. If the status
is `blocked`, stop topic commitment and drafting, then run store-role intake
from [workflow-connection-profile.md](workflow-connection-profile.md). Never
assume a B2B, B2C, or hybrid frame from the store name, the catalog, or this
Skill's examples.

Then load `profile.content_voice` and follow **Writer role (always first)** in
[workflow-blog-content.md](workflow-blog-content.md).

- If `content_voice.status` is not `ready`, run voice intake, save the profile,
  then continue. Topic planning may continue in a neutral, evidence-first voice
  while the operator has not confirmed it, but Shopify writes stay blocked.
- The role stays the same across content jobs; only structure changes.
- Do not invent a persona from another industry or another client store.

The status helper reports both gaps as `write_capabilities.blog.missing`.

## 3. Lock scene and content job

Before writing:

1. Pick **one** content job from the default set (`application`,
   `procurement_guide`, `comparison`, `technical`, `market_solution`). Offer
   optional `product_roundup` only when the merchant wants a named-PDP
   shortlist — never as fabric-only “pattern” language.
2. Run scene intake from [workflow-blog-content.md](workflow-blog-content.md)
   (buyer role, real use scene, sales questions, commercial landing, facts to
   confirm).
3. Search existing articles, pages, and collections for the same job. Prefer
   update/link over a duplicate new URL.
4. Confirm the commercial target URL and the profile’s primary inquiry CTA.

Stop and gather materials if the operator cannot name a scene or landing.

## 4. Prepare the buyer decision

Use [workflow-buyer-decision.md](workflow-buyer-decision.md) to prepare one
Blog decision brief from the confirmed scene. Keep keyword/GSC/GA4 inputs as
demand evidence only. Map every store-, product-, capability-, or commercial
claim to claim evidence, and make fit/not-fit plus the main objection explicit.

Run `validate-decision-brief --surface blog`. Fix or block the package unless
all five checks return `pass`.

## 5. Draft for craft, not for a form

Write **in** the configured seller role. Use the five dimensions in
[workflow-blog-content.md](workflow-blog-content.md):

1. topic fit
2. body usefulness
3. images
4. tables
5. internal links + CTA

Show the operator a short pass/fix/blocked scorecard. Fix failures before
building Shopify variables. `needs_media` packages stay local until images
exist.

## 6. Build the article package

Save under `<workspace>/outputs/blog/<handle-or-slug>/` (or the project’s
existing blog output convention). Include:

- store role summary (business model, audience, market, content language,
  conversion goal);
- writer role summary (from `content_voice.role` + expertise);
- content job + scene summary (2–4 sentences);
- target blog and language;
- title and handle;
- summary;
- body HTML (or Markdown-to-HTML result);
- SEO title and description;
- tags;
- featured image URL + alt; inline image list;
- internal links (commercial target + supports);
- B2B inquiry CTA (profile-approved);
- sources / verified facts / unresolved merchant facts;
- selected demand evidence and source period;
- buyer decision brief and five-check readiness result;
- craft scorecard result;
- for updates: `last_content_update` and `cooldown_until`, or the named
  cooldown exception;
- publication choice: draft, immediate, or scheduled.

Check existing titles, handles, and keyword intent for collisions.

## 7. Create a new article

1. Require buyer-decision readiness **pass**, `content_voice.status: ready`,
   and craft scorecard **pass** (images may stay brief-only only if not
   offering Shopify write yet).
2. Prepare variables with `isPublished: false` and pass the
   `article-create-draft` guard.
3. Ask Approval A for the exact draft preview (title, handle, body excerpt,
   images, links, CTA).
4. Execute `assets/graphql/article-create-draft.graphql`, pass the matching
   response check, and read back blog, ID, title, handle, body, summary, tags,
   image, and publication state.
5. Prepare variables under `article-publish` or `article-schedule`, pass that
   guard, and ask Approval B to publish immediately or at the exact
   store-timezone schedule.
6. Execute `assets/graphql/article-update.graphql`, pass the same operation’s
   response check, and verify both Admin state and the public URL.

Approval A never authorizes publication or scheduling.

## 8. Revise a published article

### Check the rewrite cooldown first

Search traffic reacts to a rewrite over weeks, not days. Flat impressions, CTR,
or position shortly after an edit are **not** evidence that the article needs
rewriting again.

Before proposing a rewrite for ranking or CTR reasons:

1. Find the last material content update for that URL — a change to title, body,
   summary, SEO title, or meta description. Use the article package notes,
   `<workspace>/ai-log/operations-log.md`, or the live article's Admin
   `updatedAt`.
2. Compute the cooldown as **28 calendar days** from that date in the store
   timezone (`store.iana_timezone`).
3. Record `last_content_update` and `cooldown_until` in the package evidence.

Inside the cooldown, do not schedule another ranking-driven rewrite of that URL.
Show the operator the cooldown date and offer a new article or a different
surface instead. If no material update date can be found, say so and treat the
URL as outside cooldown.

These changes are always allowed inside the cooldown; name the reason when you
use one:

- a broken link, a wrong commercial target, or a duplicate URL created by
  mistake;
- a claim, legal, or merchant correction such as a wrong MOQ, price, or
  certification;
- an indexation or technical defect such as an unintended noindex, a bad
  canonical, or a broken redirect;
- the operator explicitly asks for another rewrite now, after seeing the
  cooldown date.

### Then rewrite

Read the live article, save a pre-write snapshot, and show an exact field
diff. Re-load store role and `content_voice` before rewriting. Re-check the
shared Blog decision brief and the five craft dimensions when the change is
material (body, images, tables, or commercial links). Pass the `article-update`
variable guard before one approval, then execute, pass the matching response
check, read back, and verify the public page. Treat a handle change separately;
show the old and new paths and route the old path into 404 handling.

Record the new `last_content_update` after a successful readback so the next
cooldown is measured from it.

Do not delete articles in V1.
