// Session runner: executes endpoints and returns a TestSession.
// No console output here — rendering belongs to the CLI layer. Progress
// (AI spinner hooks) flows through the optional `events` sink.

import { Endpoint } from "../domain/endpoint.js";
import { SampledRef } from "../domain/ref.js";
import { SchemaDefinition } from "../domain/schema.js";
import { TestResult, TestSession } from "../domain/session.js";
import { AppCredentials, loadCredentials, resolveProject, saveCredentials, saveRefs } from "../config/app.js";
import { SessionStore } from "../config/sessions.js";
import type { AiGenerator } from "../ai/remote.js";
import { Fetch, HttpResult, checkServer, joinUrl, request } from "./http.js";
import { login } from "./auth.js";
import { ParamPrompter, resolvePath } from "./params.js";
import { resolvePayload } from "./payloads.js";
import { RefResolver, normalizeHost } from "./refs.js";
import { buildApiGraph } from "../scan/schemas/buildApiGraph.js";

export interface RunEvents {
  payloadStart?(endpoint: Endpoint): void;
  payloadDone?(endpoint: Endpoint, source: "gemini" | "fallback"): void;
  /** A reference id was sampled (or refreshed) and cached in `.sonic-point.json`. */
  refSampled?(ref: SampledRef): void;
}

export interface RunOptions {
  rootDir: string;
  allEndpoints: Endpoint[];
  credentials: AppCredentials;
  ai: AiGenerator | null;
  fetchImpl?: Fetch;
  prompter?: ParamPrompter;
  store?: SessionStore;
  maxResponseChars?: number;
  events?: RunEvents;
  /** Optional seed for :param resolution (e.g. /test GET /api/items/item-42). */
  paramDefaults?: ReadonlyMap<string, string>;
}

export class RunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunError";
  }
}

export async function runSession(targets: Endpoint[], options: RunOptions): Promise<TestSession> {
  if (targets.length === 0) {
    throw new RunError("No endpoints selected.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const maxResponseChars = options.maxResponseChars ?? 1000;
  const startedAt = new Date().toISOString();

  const { token, baseUrl } = await login(options.credentials, fetchImpl);

  // Cache fresh tokens so the next invocation reuses them without logging in.
  if (!options.credentials.token) {
    saveCredentials(options.rootDir, { ...options.credentials, token });
  }

  const server = await checkServer(baseUrl, fetchImpl);
  if (!server.ok) {
    throw new RunError(`Cannot reach ${baseUrl}: ${server.reason}. Is the backend running?`);
  }

  const schemas = needsPayload(targets) ? loadSchemas(options.rootDir) : new Map();
  const refs = needsPayload(targets)
    ? new RefResolver({
        // Caller-loaded credentials win; the config file is the fallback source
        // of truth (it is also where captures are written back).
        refs: options.credentials.refs ?? loadCredentials(options.rootDir)?.refs ?? {},
        host: normalizeHost(baseUrl),
        endpoints: options.allEndpoints,
        baseUrl,
        token,
        fetchImpl,
        onSampled: options.events?.refSampled,
      })
    : null;
  const project = resolveProject(options.rootDir);
  const cache = new Map<string, string>(options.paramDefaults ?? []);
  const results: TestResult[] = [];
  let order = 0;

  for (const endpoint of targets) {
    order += 1;
    const testedAt = new Date().toISOString();

    const resolved = await resolvePath(endpoint, {
      endpoints: options.allEndpoints,
      baseUrl,
      token,
      cache,
      prompter: options.prompter ?? { askParam: async () => null },
      fetchImpl,
      allowPrompt: endpoint.method !== "GET",
    });

    if (!resolved) {
      results.push({
        kind: "skipped",
        order,
        method: endpoint.method,
        path: endpoint.path,
        resolvedPath: endpoint.path,
        reason: `Dynamic parameter could not be resolved for ${endpoint.path}.`,
        testedAt,
      });
      continue;
    }

    const isWrite = isWriteMethod(endpoint.method);

    if (isWrite) options.events?.payloadStart?.(endpoint);
    const payload = await resolvePayload(endpoint, schemas.get(`${endpoint.method} ${endpoint.path}`), options.ai, refs);

    if (isWrite) {
      if (!payload) {
        results.push({
          kind: "skipped",
          order,
          method: endpoint.method,
          path: endpoint.path,
          resolvedPath: resolved,
          reason: `No request payload could be generated for ${endpoint.method} ${endpoint.path}.`,
          testedAt,
        });
        continue;
      }

      options.events?.payloadDone?.(endpoint, payload.source);
    }

    const response = await request(
      endpoint.method,
      joinUrl(baseUrl, resolved),
      token,
      fetchImpl,
      payload?.body,
    );

    // A cached foreign key that the server calls "not found" is resampled on
    // the next run — the failure itself is still reported as a failure.
    if (payload && isNotFound(response)) {
      for (const ref of payload.refs) {
        if (ref.fromCache) refs?.markStale(ref.noun);
      }
    }

    results.push({
      kind: "executed",
      order,
      method: endpoint.method,
      path: endpoint.path,
      resolvedPath: resolved,
      statusCode: response.status,
      success: response.ok,
      latencyMs: response.latencyMs,
      payload: payload?.body,
      responsePreview: preview(response.body, maxResponseChars),
      auth: token ? "bearer" : "none",
      aiGenerated: payload?.source === "gemini",
      testedAt,
      error: response.error,
    });
  }

  const session: TestSession = {
    project: { slug: project.slug, name: project.name },
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };

  if (refs?.dirty) saveRefs(options.rootDir, refs.snapshot());

  (options.store ?? new SessionStore(options.rootDir)).save(session);

  return session;
}

const NOT_FOUND_TEXT = /not[ _-]?found|does not exist/i;

function isNotFound(result: HttpResult): boolean {
  if (result.status === 404) return true;

  const { body } = result;
  const text = typeof body === "string" ? body : body ? JSON.stringify(body) : "";
  return NOT_FOUND_TEXT.test(text);
}

function needsPayload(targets: Endpoint[]): boolean {
  return targets.some((endpoint) => isWriteMethod(endpoint.method));
}

function isWriteMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

function loadSchemas(rootDir: string): Map<string, SchemaDefinition> {
  const graph = buildApiGraph(rootDir);
  const map = new Map<string, SchemaDefinition>();

  for (const node of graph.endpoints) {
    if (node.schema) {
      map.set(`${node.endpoint.method} ${node.endpoint.path}`, node.schema);
    }
  }

  return map;
}

function preview(body: unknown, maxChars: number): string | undefined {
  if (body === undefined) return undefined;

  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  if (!text) return undefined;

  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}...`;
}
