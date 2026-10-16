// Request body resolution for write methods: AI generation when a client
// is available, deterministic fallback otherwise. Returns null when no
// payload can be produced (caller should skip the endpoint).

import { Endpoint } from "../domain/endpoint.js";
import { SchemaDefinition } from "../domain/schema.js";
import { JsonObject } from "../domain/session.js";
import { GeminiClient } from "../ai/client.js";
import { buildPayloadPrompt } from "../ai/prompt.js";

export interface ResolvedPayload {
  body: JsonObject;
  source: "gemini" | "fallback";
}

export async function resolvePayload(
  endpoint: Endpoint,
  schema: SchemaDefinition | undefined,
  ai: GeminiClient | null,
): Promise<ResolvedPayload | null> {
  if (!isWriteMethod(endpoint.method) || !schema) return null;

  if (!ai) {
    return { body: fallbackPayload(schema), source: "fallback" };
  }

  const generated = await ai.generate(buildPayloadPrompt(endpoint, schema));
  const coerced = generated ? coerceToSchema(generated, schema) : null;

  if (!coerced || Object.keys(coerced).length === 0) return null;

  return { body: coerced, source: "gemini" };
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
