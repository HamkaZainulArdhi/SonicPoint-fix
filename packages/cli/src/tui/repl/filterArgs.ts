// Lenient `[METHOD] [PATH]` parser + matcher for read-only views and report
// publishing — pure, no fs/network/Ink. Shared by /report, /schema, /context:
//   /context                    -> every endpoint (no filter)
//   /context POST               -> every POST
//   /context /api/items         -> every method on that path
//   /context POST /api/items    -> one endpoint (and its method)
// Matching is case-insensitive; a concrete path may match a `:param` template.

import { VALID_METHODS, normalizePath } from "./testArgs.js";

export interface EndpointQuery {
  method?: string;
  path?: string;
}

export type FilterArgsOk = { ok: true; value: EndpointQuery };
export type FilterArgsError = { ok: false; error: string; hint: string };

export interface QueryableEndpoint {
  method: string;
  path: string;
}

function isMethod(value: string): boolean {
  return (VALID_METHODS as readonly string[]).includes(value.toUpperCase());
}

function usage(label: string): string {
  return `Usage: /${label} [METHOD] [PATH], e.g. /${label}, /${label} GET, /${label} POST /api/items`;
}

/** Parse `[METHOD] [PATH]` — 0, 1 or 2 args; method and path are each optional. */
export function parseFilterArgs(args: string[], label: string): FilterArgsOk | FilterArgsError {
  if (args.length === 0) return { ok: true, value: {} };

  if (args.length === 1) {
    const [single] = args;
    if (isMethod(single)) return { ok: true, value: { method: single.toUpperCase() } };
    if (single.startsWith("/")) return { ok: true, value: { path: single } };
    return {
      ok: false,
      error: `Unknown /${label} filter: ${single}.`,
      hint: usage(label),
    };
  }

  if (args.length === 2) {
    const [method, path] = args;
    if (!isMethod(method)) {
      return { ok: false, error: `Unknown method: ${method}.`, hint: usage(label) };
    }
    if (!path.startsWith("/")) {
      return { ok: false, error: `Path must start with a slash: ${path}.`, hint: usage(label) };
    }
    return { ok: true, value: { method: method.toUpperCase(), path } };
  }

  return {
    ok: false,
    error: `Too many arguments for /${label}.`,
    hint: usage(label),
  };
}

export function hasQuery(query: EndpointQuery): boolean {
  return Boolean(query.method || query.path);
}

/** `"POST /api/items"` / `"POST"` / `"/api/items"` — for filter and error lines. */
export function describeQuery(query: EndpointQuery): string {
  return [query.method, query.path].filter(Boolean).join(" ");
}

export function samePath(left: string, right: string): boolean {
  return normalizePath(left) === normalizePath(right);
}

export function templateMatches(template: string, concretePath: string): boolean {
  const tSegs = template.split("/").filter(Boolean);
  const cSegs = concretePath.split("/").filter(Boolean);
  if (tSegs.length !== cSegs.length) return false;
  for (let i = 0; i < tSegs.length; i++) {
    if (tSegs[i].startsWith(":")) continue;
    if (tSegs[i] !== cSegs[i]) return false;
  }
  return true;
}

/** Does one endpoint satisfy an optional method + path filter? */
export function matchesQuery(endpoint: QueryableEndpoint, query: EndpointQuery): boolean {
  if (query.method && endpoint.method.toUpperCase() !== query.method.toUpperCase()) return false;
  if (!query.path) return true;
  if (samePath(endpoint.path, query.path)) return true;
  return !query.path.includes(":") && templateMatches(endpoint.path, query.path);
}
