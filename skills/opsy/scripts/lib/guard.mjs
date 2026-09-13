import fs from "node:fs";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateTime(value) {
  return (
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

export function validateMutationVariables(operation, variables) {
  const errors = [];

  if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
    return { ok: false, errors: ["variables must be a JSON object"] };
  }

  if (operation === "product-create-draft") {
    if (!variables.product || typeof variables.product !== "object") {
      errors.push("product input is required");
    }
    if (variables.product?.status !== "DRAFT") {
      errors.push("product-create-draft requires product.status = DRAFT");
    }
  } else if (operation === "product-variant-update") {
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(variables.productId ?? "")) errors.push("product-variant-update requires productId");
    if (!Array.isArray(variables.variants) || variables.variants.length !== 1) errors.push("Exactly one existing variant is supported");
    for (const item of Array.isArray(variables.variants) ? variables.variants : []) {
      if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(item?.id ?? "")) errors.push("Existing variant id is required");
      if (!isNonEmptyString(item?.inventoryItem?.sku)) errors.push("Confirmed variant SKU is required");
      if (Object.keys(item ?? {}).some((key) => !["id", "inventoryItem", "price"].includes(key)) || Object.keys(item?.inventoryItem ?? {}).some((key) => key !== "sku")) errors.push("Only SKU and optional price may be updated");
      if (item?.price != null && !/^\d+(?:\.\d+)?$/.test(String(item.price))) errors.push("Price must be a non-negative decimal");
    }
  } else if (operation === "staged-image-upload") {
    if (!Array.isArray(variables.input) || variables.input.length !== 1) errors.push("Stage exactly one image");
    for (const item of Array.isArray(variables.input) ? variables.input : []) {
      if (item?.resource !== "IMAGE" || item.httpMethod !== "POST" || !["image/png", "image/jpeg", "image/webp"].includes(item.mimeType) || !isNonEmptyString(item.filename)) errors.push("Only one POST image upload is supported");
    }
  } else if (operation === "image-file-create") {
    if (!Array.isArray(variables.files) || variables.files.length !== 1) errors.push("Create exactly one image file");
    for (const item of Array.isArray(variables.files) ? variables.files : []) {
      if (item?.contentType !== "IMAGE" || !/^https:\/\//.test(item.originalSource ?? "") || !isNonEmptyString(item.alt)) errors.push("Image source and alt are required");
    }
  } else if (operation === "article-create-draft") {
    if (!variables.article || typeof variables.article !== "object") {
      errors.push("article input is required");
    }
    if (variables.article?.isPublished !== false) {
      errors.push("article-create-draft requires article.isPublished = false");
    }
    if (
      Object.prototype.hasOwnProperty.call(variables.article ?? {}, "publishDate") &&
      variables.article.publishDate !== null
    ) {
      errors.push("article-create-draft must not include a publishDate");
    }
  } else if (operation === "product-update") {
    if (!variables.product || typeof variables.product !== "object") {
      errors.push("product-update requires product input");
    }
    if (!variables.product?.id) {
      errors.push("product-update requires product.id");
    }
    if (Object.prototype.hasOwnProperty.call(variables.product ?? {}, "status")) {
      errors.push("product-update must not change status; use product-activate");
    }
  } else if (operation === "article-update") {
    if (!variables.id) errors.push("article-update requires id");
    if (!variables.article || typeof variables.article !== "object") {
      errors.push("article-update requires article input");
    }
    if (variables.article?.isPublished === true) {
      errors.push("article-update must not publish; use article-publish");
    }
    if (
      Object.prototype.hasOwnProperty.call(variables.article ?? {}, "publishDate") &&
      variables.article.publishDate !== null
    ) {
      errors.push("article-update must not schedule; use article-schedule");
    }
  } else if (operation === "product-activate") {
    if (variables.product?.status !== "ACTIVE") {
      errors.push("product-activate requires product.status = ACTIVE");
    }
    if (!variables.product?.id) {
      errors.push("product-activate requires product.id");
    }
  } else if (operation === "article-publish") {
    if (!variables.id) errors.push("article-publish requires id");
    if (variables.article?.isPublished !== true) {
      errors.push("article-publish requires article.isPublished = true");
    }
    if (
      Object.prototype.hasOwnProperty.call(variables.article ?? {}, "publishDate") &&
      variables.article.publishDate !== null
    ) {
      errors.push("article-publish must not include a publishDate");
    }
  } else if (operation === "article-schedule") {
    if (!variables.id) errors.push("article-schedule requires id");
    if (!isIsoDateTime(variables.article?.publishDate)) {
      errors.push("article-schedule requires an ISO article.publishDate");
    }
    if (variables.article?.isPublished === false) {
      errors.push("article-schedule must not set article.isPublished = false");
    }
  } else if (operation === "publishable-publish") {
    if (!variables.id) errors.push("publishable-publish requires id");
    if (!Array.isArray(variables.input) || variables.input.length === 0) {
      errors.push("publishable-publish requires at least one approved publication");
    }
    for (const [index, publication] of (variables.input ?? []).entries()) {
      if (!isNonEmptyString(publication?.publicationId)) {
        errors.push(
          `publishable-publish input[${index}].publicationId is required`,
        );
      }
    }
  } else if (operation === "url-redirect-create") {
    const redirect = variables.urlRedirect;
    if (!redirect?.path?.startsWith("/")) {
      errors.push("redirect path must start with /");
    }
    if (!redirect?.target?.startsWith("/") && !/^https:\/\//i.test(redirect?.target ?? "")) {
      errors.push("redirect target must be an internal path or HTTPS URL");
    }
    if (redirect?.path === redirect?.target) {
      errors.push("redirect path and target must differ");
    }
  } else if (operation === "metafields-set") {
    if (!Array.isArray(variables.metafields) || variables.metafields.length === 0) {
      errors.push("metafields-set requires at least one validated metafield value");
    }
    if ((variables.metafields?.length ?? 0) > 25) {
      errors.push("metafields-set supports at most 25 values per request");
    }
    for (const [index, metafield] of (variables.metafields ?? []).entries()) {
      for (const key of ["ownerId", "namespace", "key", "value"]) {
        if (!isNonEmptyString(metafield?.[key])) {
          errors.push(`metafields[${index}].${key} is required`);
        }
      }
      if (!Object.prototype.hasOwnProperty.call(metafield ?? {}, "compareDigest")) {
        errors.push(
          `metafields[${index}].compareDigest is required; use null only for create-if-absent`,
        );
      } else if (
        metafield.compareDigest !== null &&
        !isNonEmptyString(metafield.compareDigest)
      ) {
        errors.push(
          `metafields[${index}].compareDigest must be a non-empty string or null`,
        );
      }
    }
  } else {
    errors.push(`unknown guarded operation: ${operation}`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateMutationFile(operation, variablesPath) {
  const variables = JSON.parse(fs.readFileSync(variablesPath, "utf8"));
  return { operation, variables_path: variablesPath, ...validateMutationVariables(operation, variables) };
}

function collectUserErrors(value, location = "$", found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUserErrors(item, `${location}[${index}]`, found));
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "userErrors" && Array.isArray(child) && child.length > 0) {
      found.push({ location: `${location}.${key}`, errors: child });
    } else {
      collectUserErrors(child, `${location}.${key}`, found);
    }
  }
  return found;
}

const responseContracts = {
  "product-variant-update": "data.productVariantsBulkUpdate.productVariants",
  "staged-image-upload": "data.stagedUploadsCreate.stagedTargets",
  "image-file-create": "data.fileCreate.files",
  "product-create-draft": "data.productCreate.product.id",
  "product-update": "data.productUpdate.product.id",
  "product-activate": "data.productUpdate.product.id",
  "article-create-draft": "data.articleCreate.article.id",
  "article-update": "data.articleUpdate.article.id",
  "article-publish": "data.articleUpdate.article.id",
  "article-schedule": "data.articleUpdate.article.id",
  "publishable-publish": "data.publishablePublish.publishable",
  "url-redirect-create": "data.urlRedirectCreate.urlRedirect.id",
  "metafields-set": "data.metafieldsSet.metafields",
};

function valueAtPath(value, dottedPath) {
  return dottedPath
    .split(".")
    .reduce(
      (current, part) =>
        current !== null && current !== undefined ? current[part] : undefined,
      value,
    );
}

function fulfillsContract(value, dottedPath) {
  const found = valueAtPath(value, dottedPath);
  if (/\.(productVariants|files)$/.test(dottedPath)) {
    return Array.isArray(found) && found.length > 0 && found.every((item) => isNonEmptyString(item?.id));
  }
  if (dottedPath.endsWith(".stagedTargets")) {
    return Array.isArray(found) && found.length === 1 && found.every((item) => isNonEmptyString(item?.url) && isNonEmptyString(item?.resourceUrl) && Array.isArray(item?.parameters));
  }
  if (/\.(metafields|productVariants|stagedTargets|files)$/.test(dottedPath)) {
    return Array.isArray(found) && found.length > 0;
  }
  if (dottedPath.endsWith(".id")) {
    return isNonEmptyString(found);
  }
  return found !== null && found !== undefined;
}

export function validateGraphqlResponse(response, operation) {
  const topLevelErrors = Array.isArray(response?.errors) ? response.errors : [];
  const userErrors = collectUserErrors(response);
  const expectedPath = responseContracts[operation];
  const contractErrors = [];
  if (!expectedPath) {
    contractErrors.push(`unknown response contract: ${operation}`);
  } else if (!fulfillsContract(response, expectedPath)) {
    contractErrors.push(`expected ${expectedPath} in GraphQL response`);
  }
  return {
    ok:
      topLevelErrors.length === 0 &&
      userErrors.length === 0 &&
      contractErrors.length === 0,
    top_level_errors: topLevelErrors,
    user_errors: userErrors,
    contract_errors: contractErrors,
  };
}

export function validateGraphqlResponseFile(operation, responsePath) {
  const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));
  return {
    operation,
    response_path: responsePath,
    ...validateGraphqlResponse(response, operation),
  };
}
