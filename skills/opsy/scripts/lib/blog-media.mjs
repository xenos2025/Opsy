import { fingerprint } from "./product-intake.mjs";

const decode = (s) => String(s).replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, x, d) => String.fromCodePoint(x ? parseInt(x, 16) : Number(d)));
export function htmlElements(body, name) {
  const clean = String(body ?? "").replace(/<!--[\s\S]*?-->/g, "");
  return [...clean.matchAll(new RegExp(`<${name}\\b((?:"[^"]*"|'[^']*'|[^'">])*)>`, "gi"))].map((m) => {
    const attributes = [...m[1].matchAll(/(?:^|\s)([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)];
    const result = {};
    for (const a of attributes) {
      const key = a[1].toLowerCase();
      if (Object.hasOwn(result, key)) result.duplicateAttribute = true;
      result[key] = decode(a[2] ?? a[3] ?? a[4]);
    }
    return result;
  });
}
const https = (value) => { try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch { return false; } };
const canonical = (value, host) => { try { return new URL(value, `https://${host}`).href; } catch { return ""; } };

export function validateBlogMedia(payload, { profile, mode, productEvidence = null }) {
  const errors = [], warnings = [];
  const add = (code, message, always = false) => (mode === "write" || always ? errors : warnings).push({ code, path: "article.mediaMappings", message });
  const article = payload.article ?? {}, host = String(profile.store?.primary_domain ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const images = htmlElements(article.bodyHtml, "img"), anchors = htmlElements(article.bodyHtml, "a");
  if (images.length < 2) add("inline_images", "At least two real inline image elements are required; comments do not count");
  const refs = Array.isArray(article.productReferences) ? article.productReferences : [];
  const mappings = Array.isArray(article.mediaMappings) ? article.mediaMappings : [];
  const linkedProducts = anchors.filter((a) => /\/products\/[^/?#]+/.test(a.href ?? ""));
  if (payload.topic?.articleFormat === "product_roundup" && !refs.length) add("product_references", "Product roundup requires verified named products");
  if (refs.length || linkedProducts.length) {
    if (productEvidence?.schema_version !== "opsy-product-evidence-v1" || payload.productEvidence?.fingerprint !== fingerprint(productEvidence) || !productEvidence.method || !Number.isFinite(Date.parse(productEvidence.observedAt))) add("product_evidence", "Load current retained product URL/media evidence and its matching fingerprint");
  }
  const ids = new Set();
  for (const ref of refs) {
    if (!ref.id || ids.has(ref.id)) add("product_reference_id", "Product references require unique identifiers");
    ids.add(ref.id);
    const evidence = productEvidence?.products?.find((p) => p.id === ref.id);
    if (!evidence || evidence.url !== ref.url || evidence.handle !== ref.handle || !evidence.sourceRef || !https(ref.url) || !ref.handle || !ref.url.endsWith(`/products/${ref.handle}`) || new URL(ref.url).hostname !== new URL(`https://${host}`).hostname) add("product_url_evidence", `Product identity, store URL or retained evidence does not match: ${ref.id}`);
    if (!anchors.some((a) => canonical(a.href, host) === ref.url && a["data-product-id"] === ref.id)) add("product_body_reference", `Body must link the exact product with data-product-id: ${ref.id}`);
    if (!(article.internalLinks ?? []).some((link) => canonical(link, host) === ref.url)) add("product_internal_link", `Internal links omit the referenced product: ${ref.id}`);
    if (!mappings.some((m) => m.productId === ref.id)) add("product_media_missing", `Referenced product needs corresponding media: ${ref.id}`);
  }
  for (const anchor of linkedProducts) {
    if (!refs.some((r) => r.id === anchor["data-product-id"] && r.url === canonical(anchor.href, host))) add("product_link_unmapped", "Every product link in the body must match a verified product reference");
  }
  const positions = [{ location: "featured", url: article.featuredImage?.url, alt: article.featuredImage?.alt }, ...images.map((i, n) => ({ location: `inline:${n + 1}`, url: i.src, alt: i.alt, annotatedId: i["data-product-id"], invalid: i.duplicateAttribute || i.srcset || i["data-src"] }))];
  for (const position of positions) {
    const matches = mappings.filter((m) => m.location === position.location);
    if (matches.length !== 1) { add("media_mapping_missing", `Exactly one mapping required for ${position.location}`); continue; }
    const m = matches[0];
    if (!https(position.url) || !position.alt?.trim() || m.url !== position.url || m.alt !== position.alt || position.invalid) add("media_body_mismatch", `Image attributes differ from the mapping or use unreviewed alternate sources: ${position.location}`, true);
    if (!m.sourceRef || m.rightsConfirmed !== true || m.relevanceConfirmed !== true) add("media_confirmation", `Source, rights and visual relevance confirmation required: ${position.location}`);
    if (position.annotatedId && position.annotatedId !== m.productId) add("media_product_mismatch", `Body product annotation differs: ${position.location}`, true);
    if (m.productId) {
      const product = productEvidence?.products?.find((p) => p.id === m.productId);
      const media = product?.media?.find((i) => i.id === m.mediaId);
      if (!ids.has(m.productId) || !media || media.url !== m.url || !media.sourceRef || m.sourceRef !== media.sourceRef) add("media_product_mismatch", `Image is not in the referenced product evidence: ${position.location}`, true);
      if (position.location !== "featured" && position.annotatedId !== m.productId) add("media_product_annotation", `Inline product image needs its exact data-product-id: ${position.location}`);
    } else if ((productEvidence?.products ?? []).some((p) => ids.has(p.id) && (p.media ?? []).some((i) => i.url === m.url))) add("media_product_unmapped", `Known product media must declare its product: ${position.location}`);
  }
  if (mappings.some((m) => !positions.some((p) => p.location === m.location))) add("media_mapping_orphan", "Mapping refers to a nonexistent image position", true);
  return { errors, warnings, needsMedia: errors.length > 0 || warnings.length > 0 };
}

export function blogPreview(payload, validation) {
  const a = payload.article ?? {};
  const escape = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  // Show source HTML inertly as well as a sandboxed render; never run imported scripts.
  const rendered = `<h1>${escape(a.title)}</h1><img src="${escape(a.featuredImage?.url)}" alt="${escape(a.featuredImage?.alt)}">${a.bodyHtml ?? ""}`;
  return `<!doctype html><html lang="zh"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; frame-src 'self' about:"><title>Blog 本地预览</title><h1>Blog 本地预览 — ${validation.ok ? "校验通过，仍需独立批准" : "待补充，不能写入"}</h1><p>静态校验不证明真实产品匹配或真人视觉验收。</p><iframe sandbox referrerpolicy="no-referrer" style="width:100%;height:70vh" srcdoc="${escape(rendered)}"></iframe><h2>相关产品、内部链接与 CTA</h2><pre>${escape(JSON.stringify({ products: a.productReferences ?? [], links: a.internalLinks, cta: a.cta }, null, 2))}</pre><h2>校验结果</h2><pre>${escape(JSON.stringify(validation, null, 2))}</pre><details><summary>文章 HTML</summary><pre>${escape(a.bodyHtml)}</pre></details></html>\n`;
}
