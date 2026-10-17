// Request body resolution for write methods: AI generation when a client
// is available, deterministic fallback otherwise. Returns null when no
// payload can be produced (caller should skip the endpoint).
//
// Body fields that reference existing records (`itemId`) are resolved first
// by sampling the user's own API (see refs.ts) and are then pinned into the
// answer — the AI is told the value and the result is overwritten with it,
// so an invented id can never reach the server.

import { Endpoint } from "../domain/endpoint.js";
import { SchemaDefinition } from "../domain/schema.js";
import { JsonObject } from "../domain/session.js";
import type { AiGenerator } from "../ai/remote.js";
import { buildPayloadPrompt } from "../ai/prompt.js";
import { RefResolver, refFields } from "./refs.js";

export interface ResolvedFieldRef {
  field: string;
  noun: string;
  /** True when the value came from the `.sonic-point.json` cache. */
  fromCache: boolean;
}

export interface ResolvedPayload {
  body: JsonObject;
  source: "gemini" | "fallback";
  /** Reference fields that were pinned, used to mark stale ids later. */
  refs: ResolvedFieldRef[];
}

export async function resolvePayload(
  endpoint: Endpoint,
  schema: SchemaDefinition | undefined,
  ai: AiGenerator | null,
  refs: RefResolver | null = null,
): Promise<ResolvedPayload | null> {
  if (!isWriteMethod(endpoint.method) || !schema) return null;

  const pinned: Record<string, string> = {};
  const resolved: ResolvedFieldRef[] = [];

  if (refs) {
    for (const { field, noun } of refFields(schema)) {
      const hit = await refs.resolve(noun);
      if (!hit.value) continue;

      pinned[field] = hit.value;
      resolved.push({ field, noun, fromCache: hit.fromCache });
    }
  }

  if (!ai) {
    return { body: pin(fallbackPayload(schema), pinned), source: "fallback", refs: resolved };
  }

  const generated = await ai.generate(buildPayloadPrompt(endpoint, schema, pinned));
  const coerced = generated ? coerceToSchema(generated, schema) : null;

  if (!coerced || Object.keys(coerced).length === 0) return null;

  return { body: pin(coerced, pinned), source: "gemini", refs: resolved };
}

/** Resolved reference values win over anything the model produced. */
function pin(body: JsonObject, pinned: Record<string, string>): JsonObject {
  return Object.keys(pinned).length === 0 ? body : { ...body, ...pinned };
}

function isWriteMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

export function fallbackPayload(schema: SchemaDefinition): JsonObject {
  const payload: JsonObject = {};

  for (const prop of schema.properties) {
    if (!prop.required) continue;
    payload[prop.name] = sampleValue(prop);
  }

  return payload;
}

function sampleValue(prop: SchemaDefinition["properties"][number]): unknown {
  if (prop.enumValues?.length) return prop.enumValues[0];
  if (prop.default !== undefined) return prop.default;

  switch (prop.type.toLowerCase()) {
    case "string":
      return sampleString(prop.name);
    case "number":
    case "integer":
      return 100;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return null;
  }
}

function sampleString(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("email")) return "user@example.com";
  if (lower.includes("uuid") || lower.includes("id")) return "550e8400-e29b-41d4-a716-446655440000";
  if (lower.includes("url")) return "https://example.com";
  if (lower.includes("date")) return new Date().toISOString();
  if (lower.includes("phone")) return "+62812345678";

  return `Sample ${name}`;
}

function coerceToSchema(
  payload: Record<string, unknown>,
  schema: SchemaDefinition,
): JsonObject {
  const coerced: JsonObject = {};

  for (const prop of schema.properties) {
    if (prop.name in payload) {
      coerced[prop.name] = payload[prop.name];
    }
  }

  return coerced;
}
