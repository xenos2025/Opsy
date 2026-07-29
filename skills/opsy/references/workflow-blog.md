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
2. Prepare variables with `isPublished: false` and pass the `article-create-draft` guard.
3. Ask Approval A for the exact draft.
4. Execute `assets/graphql/article-create-draft.graphql`, pass the matching response check, and read back blog, ID, title, handle, body, summary, tags, image, and publication state.
5. Prepare variables under `article-publish` or `article-schedule`, pass that guard, and ask Approval B to publish immediately or at the exact store-timezone schedule.
6. Execute `assets/graphql/article-update.graphql`, pass the same operation's response check, and verify both Admin state and the public URL.

Approval A never authorizes publication or scheduling.

## Revise a published article

Read the live article, save a pre-write snapshot, and show an exact field diff. Pass the `article-update` variable guard before one approval, then execute, pass the matching response check, read back, and verify the public page. Treat a handle change separately; show the old and new paths and route the old path into 404 handling.

Do not delete articles in V1.
