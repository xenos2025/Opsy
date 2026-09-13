import { validateMutationVariables } from "./guard.mjs";

const required = (value, label) => { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`); return value; };
const gid = (value, type) => { if (!new RegExp(`^gid://shopify/${type}/[0-9]+$`).test(value ?? "")) throw new Error(`Expected ${type} GID from readback`); return value; };
const price = (value) => {
  const raw = String(value ?? "");
  if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error("Price must be a confirmed non-negative decimal");
  return raw.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};

export function prepareVariantUpdate(payload, readback) {
  if (readback?.errors?.length) throw new Error("Readback contains GraphQL errors");
  required(payload.handle, "handle");
  const product = readback?.data?.product;
  const variants = product?.variants?.nodes;
  if (!Array.isArray(variants) || variants.length !== 1) throw new Error("Only a single read-back product variant is supported");
  if (product.handle !== payload.handle) throw new Error("Readback handle differs from the product package");
  const variant = { id: gid(variants[0].id, "ProductVariant"), inventoryItem: { sku: required(payload.variant?.sku, "variant.sku") } };
  if (payload.variant?.price != null) variant.price = price(payload.variant.price);
  const variables = { productId: gid(product.id, "Product"), variants: [variant] };
  return { operation: "product-variant-update", query: "assets/graphql/product-variant-update.graphql", variables, validation: validateMutationVariables("product-variant-update", variables) };
}

export function prepareArticleSeo(payload, readback) {
  if (readback?.errors?.length) throw new Error("Readback contains GraphQL errors");
  required(payload.article?.handle, "article.handle");
  const article = readback?.data?.article;
  if (article?.handle !== payload.article?.handle) throw new Error("Readback handle differs from the Blog package");
  const ownerId = gid(article?.id, "Article");
  const metafields = [["seoTitle", "title_tag", payload.article?.seoTitle], ["seoDescription", "description_tag", payload.article?.metaDescription]].map(([alias, key, value]) => {
    if (!Object.hasOwn(article, alias)) throw new Error("Read SEO metafields before preparing create-if-absent or update variables");
    const current = article[alias];
    if (current !== null && (current.type !== "single_line_text_field" || !current.compareDigest)) throw new Error("Refresh the existing SEO metafield type and compareDigest");
    return { ownerId, namespace: "global", key, type: "single_line_text_field", value: required(value, key), compareDigest: current?.compareDigest ?? null };
  });
  return { operation: "metafields-set", query: "assets/graphql/metafields-set.graphql", variables: { metafields }, validation: validateMutationVariables("metafields-set", { metafields }) };
}

export function verifyWriteFields(surface, payload, readback) {
  if (readback?.errors?.length) throw new Error("Readback contains GraphQL errors");
  const fields = [];
  const add = (name, expected, observed) => fields.push({ name, expected, observed: observed ?? null, matches: expected === observed });
  if (surface === "product") {
    const product = readback?.data?.product;
    add("handle", required(payload.handle, "handle"), product?.handle);
    const variants = product?.variants?.nodes;
    if (!Array.isArray(variants) || variants.length !== 1) throw new Error("Expected exactly one variant in product readback");
    if (payload.variant?.sku) add("variant.sku", payload.variant.sku, variants[0].sku);
    if (payload.variant?.price != null) add("variant.price", price(payload.variant.price), price(variants[0].price));
  } else if (surface === "blog") {
    const article = readback?.data?.article;
    add("handle", required(payload.article?.handle, "article.handle"), article?.handle);
    add("seoTitle", required(payload.article?.seoTitle, "seoTitle"), article?.seoTitle?.value);
    add("metaDescription", required(payload.article?.metaDescription, "metaDescription"), article?.seoDescription?.value);
  } else throw new Error("surface must be product or blog");
  return { ok: fields.every((field) => field.matches), surface, fields, limitation: "Checks only the listed fields; content, media, publication and storefront checks remain required" };
}
