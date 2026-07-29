# Workflow: Blog 与内容

## Choose an entry

Offer:

1. **Data-recommended topics**: use the latest valid monthly snapshot and current site content; show the data period, evidence, duplication check, and no more than three candidates.
2. **Merchant-directed topic or materials**: use the supplied question, brief, product facts, or media. Do not invent search volume, ranking, or opportunity scores.

## Build an article package

Include:

- target blog and language;
- title and handle;
- summary;
- body HTML or Markdown-to-HTML result;
- SEO title and description;
- tags;
- image and alt text;
- internal links;
- B2B inquiry CTA;
- sources and evidence;
- unresolved facts;
- publication choice: draft, immediate, or scheduled.

Check existing article titles, handles, and keyword intent for collisions.

## Create a new article

1. Save and validate the local article package.
2. Ask Approval A for the exact draft.
3. Use `assets/graphql/article-create-draft.graphql` with `isPublished: false`.
4. Read back blog, ID, title, handle, body, summary, tags, image, and publication state.
5. Ask Approval B to publish immediately or at the exact store-timezone schedule.
6. Execute and verify both Admin state and the public URL.

Approval A never authorizes publication or scheduling.

## Revise a published article

Read the live article, save a pre-write snapshot, and show an exact field diff. After one approval, update, read back, and verify the public page. Treat a handle change separately; show the old and new paths and route the old path into 404 handling.

Do not delete articles in V1.
