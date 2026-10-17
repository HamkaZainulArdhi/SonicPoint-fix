// Dynamic path resolution: `:itemId` values are sampled from sibling
// GET collection responses. GET endpoints never prompt — when nothing can
// be sampled, the caller receives null and should skip the endpoint.

import { Endpoint } from "../domain/endpoint.js";
import { Fetch, joinUrl } from "./http.js";
import {
  dynamicParams,
  firstResource,
  hasParams,
  idOf,
  lastSegment,
  singular,
  stripIdSuffix,
  stripTrailingSlash,
} from "./resources.js";

export interface ParamPrompter {
  askParam(paramName: string): Promise<string | null>;
}

export interface ResolveContext {
  endpoints: Endpoint[];
  baseUrl: string;
  token: string;
  cache: Map<string, string>;
  prompter: ParamPrompter;
  fetchImpl: Fetch;
  allowPrompt: boolean;
}

export async function resolvePath(endpoint: Endpoint, ctx: ResolveContext): Promise<string | null> {
  let resolved = endpoint.path;

  for (const param of dynamicParams(endpoint.path)) {
    const value = await resolveParam(endpoint, param, ctx);
    if (!value) return null;

    resolved = resolved.replace(`:${param}`, encodeURIComponent(value));
  }

  return resolved;
}

async function resolveParam(
  endpoint: Endpoint,
  param: string,
  ctx: ResolveContext,
): Promise<string | null> {
  const cached = ctx.cache.get(param);
  if (cached) return cached;

  for (const collection of rankCollections(endpoint, param, ctx.endpoints)) {
    const sampled = await sampleId(collection, param, ctx);
    if (sampled) {
      ctx.cache.set(param, sampled);
      return sampled;
    }
  }

  if (!ctx.allowPrompt) return null;

  const manual = await ctx.prompter.askParam(param);
  if (!manual) return null;

  ctx.cache.set(param, manual);
  return manual;
}

/** Candidate collection paths, best first. */
function rankCollections(endpoint: Endpoint, param: string, endpoints: Endpoint[]): string[] {
  const scores = new Map<string, number>();
  const consider = (candidate: string | null, score: number): void => {
    if (!candidate) return;
    const key = stripTrailingSlash(candidate);
    scores.set(key, Math.max(scores.get(key) ?? 0, score));
  };

  const parent = parentCollection(endpoint.path, param);
  consider(parent, 80);

  const wanted = singular(stripIdSuffix(param));
  const statics = endpoints.filter((e) => e.method === "GET" && !hasParams(e.path));

  for (const candidate of statics) {
    const normalized = stripTrailingSlash(candidate.path);

    if (parent && normalized === stripTrailingSlash(parent)) {
      consider(candidate.path, 120);
    } else if (singular(lastSegment(candidate.path)) === wanted) {
      const sameScope = isAdmin(endpoint.path) === isAdmin(candidate.path);
      consider(candidate.path, sameScope ? 90 : 70);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([path]) => path);
}

async function sampleId(
  collectionPath: string,
  param: string,
  ctx: ResolveContext,
): Promise<string | null> {
  try {
    const response = await ctx.fetchImpl(joinUrl(ctx.baseUrl, collectionPath), {
      method: "GET",
      headers: { Authorization: `Bearer ${ctx.token}` },
    });

    if (!response.ok) return null;

    const resource = firstResource(await response.json());
    if (!resource) return null;

    return idOf(resource, paramIdKeys(param));
  } catch {
    return null;
  }
}

function paramIdKeys(param: string): string[] {
  const base = stripIdSuffix(param);

  return [...new Set(["id", "uuid", "_id", param, base, `${base}Id`, `${base}_id`])];
}

function parentCollection(routePath: string, param: string): string | null {
  const segments = routePath.split("/").filter(Boolean);
  const index = segments.indexOf(`:${param}`);

  if (index <= 0) return null;
  return `/${segments.slice(0, index).join("/")}`;
}

/** Admin and public namespaces must not sample ids from each other. */
function isAdmin(routePath: string): boolean {
  return stripTrailingSlash(routePath).startsWith("/api/admin");
}

