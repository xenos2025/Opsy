import fs from "node:fs";
import path from "node:path";

const text = (value) => typeof value === "string" && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.every(text);
const timestamp = (value) => text(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

// Shared by Product, Blog and state checks. No customer files are modified.
export function validateContentVoice(voice, { standalone = false } = {}) {
  const errors = [], missing = [];
  const fail = (field, message) => errors.push({ path: field, message });
  if (!voice || typeof voice !== "object" || Array.isArray(voice)) {
    return { ok: false, ready: false, missing: ["content_voice"], errors: [{ path: "content_voice", message: "Expected a content voice object" }] };
  }
  if ((standalone || voice.schema_version !== undefined) && voice.schema_version !== "content-voice-v1") {
    fail("schema_version", "Expected content-voice-v1");
  }
  if (!["not_started", "ready"].includes(voice.status)) fail("status", "Expected not_started or ready");
  for (const field of ["role", "buyer_relationship", "example_phrasing"]) {
    if (voice[field] != null && typeof voice[field] !== "string") fail(field, "Expected text or null");
  }
  for (const field of ["expertise", "tone", "must_do", "must_not", "signature_proof"]) {
    if (voice[field] !== undefined && !strings(voice[field])) fail(field, "Expected an array of non-empty strings");
  }
  if (voice.updated_at != null && !timestamp(voice.updated_at)) fail("updated_at", "Expected an ISO timestamp with timezone");
  if (voice.status !== "ready") missing.push("status");
  for (const field of ["role", "buyer_relationship"]) {
    if (!text(voice[field])) missing.push(field);
  }
  for (const field of ["expertise", "tone", "must_do", "must_not"]) {
    if (!strings(voice[field]) || !voice[field].length) missing.push(field);
  }
  if (!strings(voice.signature_proof)) missing.push("signature_proof");
  if (!timestamp(voice.updated_at)) missing.push("updated_at");
  return { ok: errors.length === 0, ready: errors.length === 0 && missing.length === 0, missing, errors };
}

export function loadContentProfile(workspaceRoot) {
  const profile = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "config", "store-profile.json"), "utf8"));
  const voicePath = path.join(workspaceRoot, "config", "content_voice.json");
  if (!fs.existsSync(voicePath)) {
    return { ...profile, content_voice_source: "config/store-profile.json#profile.content_voice" };
  }
  let voice;
  try {
    voice = JSON.parse(fs.readFileSync(voicePath, "utf8"));
  } catch {
    throw new Error("config/content_voice.json cannot be read as JSON; repair it instead of falling back to the legacy voice");
  }
  // The independent file is authoritative, including incomplete or invalid data.
  return { ...profile, profile: { ...profile.profile, content_voice: voice }, content_voice_source: "config/content_voice.json" };
}

export function profileVoiceStatus(profile) {
  return {
    source: profile?.content_voice_source ?? "config/store-profile.json#profile.content_voice",
    ...validateContentVoice(profile?.profile?.content_voice, { standalone: profile?.content_voice_source === "config/content_voice.json" }),
  };
}
