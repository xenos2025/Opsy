import fs from "node:fs";

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
  } else if (operation === "product-activate") {
    if (variables.product?.status !== "ACTIVE") {
      errors.push("product-activate requires product.status = ACTIVE");
    }
    if (!variables.product?.id) {
      errors.push("product-activate requires product.id");
    }
  } else if (operation === "publishable-publish") {
    if (!variables.id) errors.push("publishable-publish requires id");
    if (!Array.isArray(variables.input) || variables.input.length === 0) {
      errors.push("publishable-publish requires at least one approved publication");
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

export function validateGraphqlResponse(response) {
  const topLevelErrors = Array.isArray(response?.errors) ? response.errors : [];
  const userErrors = collectUserErrors(response);
  return {
    ok: topLevelErrors.length === 0 && userErrors.length === 0,
    top_level_errors: topLevelErrors,
    user_errors: userErrors,
  };
}

export function validateGraphqlResponseFile(responsePath) {
  const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));
  return { response_path: responsePath, ...validateGraphqlResponse(response) };
}
