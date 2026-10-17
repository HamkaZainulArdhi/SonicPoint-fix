// Shared route/resource helpers. Two consumers sample the same way:
// path params (`params.ts` — `:itemId` in a URL) and body reference
// fields (`refs.ts` — `itemId` inside a POST body). Keeping the JSON
// readers and the collection ranking here means both stay in sync.

import { Endpoint } from "../domain/endpoint.js";

/** `:token` names in a route template. */
export function dynamicParams(routePath: string): string[] {
  return [...routePath.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
}

export function hasParams(routePath: string): boolean {
  return dynamicParams(routePath).length > 0;
}

export function stripTrailingSlash(routePath: string): string {
  return routePath === "/" ? routePath : routePath.replace(/\/+$/, "") || "/";
}

export function lastSegment(routePath: string): string {
  const segments = stripTrailingSlash(routePath).split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export function singular(value: string): string {
  const lower = value.toLowerCase();
  if (lower.endsWith("ies")) return lower.slice(0, -3) + "y";
  if (lower.endsWith("ses")) return lower.slice(0, -2);
  if (lower.endsWith("s") && lower.length > 1) return lower.slice(0, -1);
  return lower;
}

/** `analysisId` → `analysis`; strips the trailing id marker only. */
export function stripIdSuffix(param: string): string {
  return param
    .replace(/[_-]?id$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/** Case/separator-insensitive comparison key (`plant-analysis` → `plantanalysis`). */
export function normalizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * Body fields that carry a foreign key: `itemId`, `item_id`, `id_item`,
 * `plantAnalysisId`, `itemUuid`. Plain `id`/`uuid` (the resource's own id)
 * deliberately do not match. Returns the canonical noun, or null.
 */
export function referenceNoun(fieldName: string): string | null {
  const patterns = [
    /^(.+?)Id$/,
    /^(.+?)ID$/,
    /^(.+?)Uuid$/i,
    /^(.+?)_id$/i,
    /^(.+?)_uuid$/i,
    /^id_(.+)$/i,
    /^uuid_(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(fieldName);
    const raw = match?.[1];
    if (!raw) continue;

    const noun = raw
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[_\s]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return noun.length >= 2 ? noun : null;
  }

  return null;
}

/** Field names to try when reading an id out of a sampled resource. */
export function idKeysFor(noun: string): string[] {
  const camel = noun.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  return [...new Set(["id", "uuid", "_id", noun, camel, `${camel}Id`, `${noun}_id`])];
}

/**
 * GET collections that could hold rows for `noun`, best match first.
 * Only static collections qualify (a parameterized route cannot be listed).
 */
export function collectionCandidates(noun: string, endpoints: Endpoint[]): string[] {
  const wanted = normalizeSegment(noun);
  const wantedSingular = normalizeSegment(singular(noun));
  const scored = new Map<string, number>();

  for (const endpoint of endpoints) {
    if (endpoint.method !== "GET" || hasParams(endpoint.path)) continue;

    const segment = lastSegment(endpoint.path);
    const score =
      normalizeSegment(segment) === wanted
        ? 100
        : normalizeSegment(singular(segment)) === wantedSingular
          ? 90
          : 0;

    if (score === 0) continue;

    const key = stripTrailingSlash(endpoint.path);
    scored.set(key, Math.max(scored.get(key) ?? 0, score));
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .map(([path]) => path);
}

/** First JSON object that looks like a resource (unwraps list envelopes). */
export function firstResource(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstResource(item);
      if (found) return found;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  for (const key of ["data", "items", "results", "rows", "docs", "records"]) {
    if (key in obj) {
      const found = firstResource(obj[key]);
      if (found) return found;
    }
  }

  if ("id" in obj || "uuid" in obj || "_id" in obj) return obj;

  for (const nested of Object.values(obj)) {
    const found = firstResource(nested);
    if (found) return found;
  }

  return obj;
}

export function idOf(resource: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = resource[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }

  return null;
}
