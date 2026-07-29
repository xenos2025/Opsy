# Workflow: 404 处理

## Build or refresh the queue

Use:

- optional `data-center/gsc_not_found.csv`;
- unresolved entries from the previous queue;
- `<workspace>/ai-log/handle-changes.csv`;
- explicitly supplied URLs.

Run:

```text
node <skill-root>/scripts/opsy.mjs refresh-404 --project <project-root>
```

This previews a read-only queue. Use `--apply` only to save the local queue; it never writes redirects.

## Verify each candidate

For every URL, record:

- source and source period;
- current HTTP response and final URL;
- whether internal links or sitemap entries still reference it;
- historical or business value;
- closest genuinely equivalent live target;
- confidence and evidence.

Do not treat Google URL Inspection as a complete discovery source. Do not treat every 404 as an error.

## Classify

- `redirect`: a genuinely equivalent replacement exists.
- `fix_source`: repair an internal link or sitemap entry.
- `keep_gone`: the resource should remain 404/410.
- `ignore_junk`: bot probes, malformed paths, or no business value.
- `needs_review`: evidence is insufficient.

Never redirect unrelated URLs to the home page.

## Write selected redirects

Show only verified `redirect` candidates with exact `path → target` pairs. Let the operator select the precise set. Pass each saved pair through the `url-redirect-create` variable guard before requesting approval. After explicit approval, create each redirect with `assets/graphql/url-redirect-create.graphql`, pass the matching response check, and read back the returned ID using `assets/graphql/node-redirect-readback.graphql`.

Record successes and failures per item. One failure must not imply the rest succeeded.
