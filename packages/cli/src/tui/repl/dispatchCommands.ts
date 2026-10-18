// Command handlers — the only bridge between the REPL and SonicPoint Core.
// No business logic here: scan/schema/context/test all come from existing
// core (scanEndpoints, buildApiGraph, buildKnowledgeGraph, runSession).

import { scanEndpoints } from "../../scan/routes/scanEndpoints.js";
import { scanSchemas } from "../../scan/schemas/scanSchemas.js";
import { buildApiGraph } from "../../scan/schemas/buildApiGraph.js";
import { buildKnowledgeGraph } from "../../scan/knowledge/buildKnowledge.js";
import { bodyEndpointNodes } from "../../scan/reports/formatSchema.js";
import { ParsedInput, SLASH_COMMANDS } from "./commandRegistry.js";
import { OutputLine } from "./transcript.js";
import { groupEndpointsByFile } from "../views/scanView.js";
import { toSchemaLines } from "../views/schemaView.js";
import { toContextLines } from "../views/contextView.js";
import { toTestLines } from "../views/testView.js";
import { concreteParamsForTemplate, parseTestArgs } from "./testArgs.js";
import {
  describeQuery,
  hasQuery,
  matchesQuery,
  parseFilterArgs,
  samePath,
  templateMatches,
  EndpointQuery,
  QueryableEndpoint,
} from "./filterArgs.js";
import { loadCredentials } from "../../config/app.js";
import { resolveGeminiKey, resolveSupabase } from "../../config/providers.js";
import { resolvePlatformUrl } from "../../config/platform.js";
import { SessionStore } from "../../config/sessions.js";
import { GeminiClient } from "../../ai/client.js";
import { RemoteAiClient } from "../../ai/remote.js";
import { publishSession } from "../../report/publish.js";
import { publishViaPlatform } from "../../report/remote.js";
import { SupabaseReportStore } from "../../report/store.js";
import { toReportLines } from "../views/reportView.js";
import { Fetch } from "../../run/http.js";
import { dynamicParams } from "../../run/resources.js";
import { refNotice } from "../../run/refs.js";
import { RunError, runSession } from "../../run/runner.js";
import { Endpoint } from "../../domain/endpoint.js";

export type HandlerAction = "append" | "clear" | "quit";

export interface HandlerResult {
  action: HandlerAction;
  lines: OutputLine[];
}

export function handleParsed(rootDir: string, parsed: ParsedInput): HandlerResult {
  switch (parsed.kind) {
    case "empty":
      return { action: "append", lines: [] };
    case "not-slash":
      return {
        action: "append",
        lines: [{ text: "Commands start with /. Try /scan to discover endpoints.", tone: "dim" }],
      };
    case "unknown":
      return {
        action: "append",
        lines: [
          {
            text: `Unknown command: /${parsed.name}. Available: ${SLASH_COMMANDS.map((entry) => `/${entry.name}`).join(" ")}`,
            tone: "red",
          },
        ],
      };
    case "command":
      return handleCommand(rootDir, parsed.command.name, parsed.args);
  }
}

function handleCommand(rootDir: string, name: string, args: string[]): HandlerResult {
  switch (name) {
    case "quit":
      return { action: "quit", lines: [] };
    case "clear":
      return { action: "clear", lines: [] };
    case "scan":
      return { action: "append", lines: runScan(rootDir) };
    case "schema":
      return { action: "append", lines: runSchema(rootDir, args) };
    case "context":
      return { action: "append", lines: runContext(rootDir, args) };
    case "test": {
      // Synchronous pre-check only (pure parser, no network). The real run
      // is async via runTest() — ReplApp drives that path. Direct callers of
      // handleParsed still get an honest answer either way.
      const pre = parseTestArgs(args);
      if (!pre.ok) {
        return {
          action: "append",
          lines: [
            { text: pre.error, tone: "red" },
            { text: pre.hint, tone: "dim" },
          ],
        };
      }
      return {
        action: "append",
        lines: [{ text: "Testing… (use the REPL to run /test; this preview never hits the network)", tone: "dim" }],
      };
    }
    case "config": {
      // The interactive 6-step flow is driven by ReplApp (multi-turn input).
      // Direct callers of handleParsed still get an honest answer either way.
      return {
        action: "append",
        lines: [{ text: "Config flow runs in the REPL (6 steps, Esc cancels).", tone: "dim" }],
      };
    }
    case "report": {
      // Async publish via runReport() — ReplApp drives that path. Direct
      // callers of handleParsed still get an honest answer either way.
      return {
        action: "append",
        lines: [{ text: "Publishing… (use the REPL to run /report; this preview never hits the network)", tone: "dim" }],
      };
    }
    default:
      return { action: "append", lines: [{ text: `/${name} is not implemented yet.`, tone: "yellow" }] };
  }
}

export interface RunTestDeps {
  fetchImpl?: Fetch;
  /**
   * REPL working session (in-memory `MergingSessionStore`): runs accumulate
   * in one session while the CLI is open. Without it the run writes
   * `session-cache.json` like `send` does.
   */
  store?: SessionStore;
}

/**
 * Full /test flow — the REPL equivalent of `sendCommand` (commands.ts).
 * Differences are deliberate and documented:
 * - AUTH gate: credentials must already exist (written by /config or `init`).
 *   Never prompts inside Ink (inquirer would steal the TTY).
 * - :param prompting: never prompts; unresolvable params become `skipped`
 *   results with a concrete-id hint (same honesty as GET in params.ts).
 * - No ora spinner (would fight Ink); ReplApp shows one static interim line.
 * - Working session: the REPL passes its in-memory `MergingSessionStore`
 *   (deps.store) so runs accumulate in one session; the REPL never writes
 *   `session-cache.json` — quitting the CLI discards the session entirely.
 * - Secrets (password/token) are never rendered into transcript lines.
 */
export async function runTest(rootDir: string, args: string[], deps?: RunTestDeps): Promise<OutputLine[]> {
  const parsed = parseTestArgs(args);
  if (!parsed.ok) {
    return [
      { text: parsed.error, tone: "red" },
      { text: parsed.hint, tone: "dim" },
    ];
  }

  const credentials = loadCredentials(rootDir);
  if (!credentials || !credentials.baseUrl?.trim() || !credentials.loginEndpoint?.trim()) {
    return [
      { text: "Not configured — /test needs AUTH credentials first.", tone: "red" },
      { text: "Run /config first to set base URL + login, then /test again.", tone: "yellow" },
    ];
  }
  try {
    void new URL(credentials.baseUrl);
  } catch {
    return [
      { text: `Invalid base URL: ${credentials.baseUrl}`, tone: "red" },
      { text: "Run /config to fix the backend target, then /test again.", tone: "yellow" },
    ];
  }

  let endpoints: Endpoint[];
  try {
    endpoints = scanEndpoints(rootDir);
  } catch (error) {
    return [{ text: `✖ Scan failed: ${error instanceof Error ? error.message : String(error)}`, tone: "red" }];
  }

  // Select targets (strict /test semantics — intentionally NOT selectTargets'
  // lenient `send` default which silently ignores a bare path).
  let targets: Endpoint[];
  let paramDefaults: Map<string, string> | undefined;
  if (parsed.filter.kind === "bulk") {
    targets = endpoints.filter((endpoint) => endpoint.method === "GET");
    if (targets.length === 0) {
      return [{ text: "No GET endpoints found.", tone: "yellow" }];
    }
    // Static collections first so :param sampling (shared cache in runSession)
    // sees collection responses before parameterized endpoints need them.
    targets = [...targets].sort((a, b) => Number(hasParams(a.path)) - Number(hasParams(b.path)));
  } else {
    const { method, path } = parsed.filter;
    const match = findEndpoint(endpoints, method, path);
    if (!match) {
      const available = endpoints
        .filter((endpoint) => endpoint.method === method)
        .slice(0, 5)
        .map((endpoint) => `${endpoint.method} ${endpoint.path}`);
      return [
        { text: `Endpoint not found: ${method} ${path}.`, tone: "red" },
        {
          text: available.length > 0 ? `Available ${method}: ${available.join(" · ")}` : `No ${method} endpoints found. Try /scan first.`,
          tone: "dim",
        },
      ];
    }
    targets = [match.endpoint];
    paramDefaults = match.paramDefaults ?? undefined;
  }

  const needsAi = targets.some((t) => t.method === "POST" || t.method === "PUT" || t.method === "PATCH");
  const warnings: OutputLine[] = [];
  const gemini = resolveGeminiKey();
  if (needsAi) {
    for (const w of gemini.warnings) warnings.push({ text: w, tone: "yellow" as const });
  }
  // AI dari platform BE — tanpa key lokal tetap jalan (fallback deterministik
  // kalau platform tak terjangkau).
  const ai = gemini.value ? new GeminiClient(gemini.value) : new RemoteAiClient(resolvePlatformUrl());

  try {
    const refNotices: OutputLine[] = [];
    const session = await runSession(targets, {
      rootDir,
      allEndpoints: endpoints,
      credentials,
      ai,
      // Never prompt inside the REPL — unresolvable :params become `skipped`.
      prompter: { askParam: async () => null },
      store: deps?.store ?? new SessionStore(rootDir),
      paramDefaults,
      fetchImpl: deps?.fetchImpl,
      events: {
        refSampled: (ref) => refNotices.push({ text: refNotice(ref), tone: "dim" }),
      },
    });

    // Honesty line: the working session spans all /test runs in this CLI
    // sitting — /report publishes the whole thing, not just this run.
    const count = (deps?.store?.load() ?? session).results.length;

    return [
      ...warnings,
      ...refNotices,
      ...toTestLines(session),
      {
        text: `Session so far: ${count} endpoint${count === 1 ? "" : "s"} — /report publishes all of them.`,
        tone: "dim",
      },
    ];
  } catch (error) {
    const raw = error instanceof RunError || error instanceof Error ? error.message : String(error);
    const prefix = raw.includes("Cannot reach login endpoint")
      ? "✖ Cannot reach login endpoint: "
      : raw.startsWith("Login failed")
        ? "✖ Login failed: "
        : raw.startsWith("Token not found")
          ? "✖ Login failed: "
          : raw.startsWith("Cannot reach")
            ? "✖ Cannot reach server: "
            : "✖ Test failed: ";
    const hint: OutputLine[] =
      raw.includes("Cannot reach") || raw.startsWith("Login failed")
        ? [{ text: "Check baseUrl and loginEndpoint in /config. Is the backend running?", tone: "dim" as const }]
        : [];
    return [...warnings, { text: `${prefix}${raw}`, tone: "red" as const }, ...hint];
  }
}

export interface RunReportDeps {
  fetchImpl?: typeof fetch;
  /** REPL working session; when empty, falls back to the cached `send` session. */
  store?: SessionStore;
}

/**
 * Full /report flow — the REPL equivalent of `reportCommand` (commands.ts).
 * Publishes the working session accumulated by /test (deps.store, in-memory)
 * or, when that is empty, the cached `send` session — via the platform BE,
 * which stores passed, failed and skipped results for the summary cards.
 * Falls back to direct Supabase only when the platform is unreachable
 * and local credentials exist. Never throws — outcomes are transcript lines.
 */
export async function runReport(rootDir: string, args: string[], deps?: RunReportDeps): Promise<OutputLine[]> {
  const session = deps?.store?.load() ?? new SessionStore(rootDir).load();

  if (!session) {
    return [
      { text: "No cached session found. Run /test first.", tone: "red" },
      { text: "Tip: /test GET runs all GET endpoints, /test POST /api/items runs one write.", tone: "dim" },
    ];
  }

  const filter = parseFilterArgs(args, "report");
  if (!filter.ok) {
    return [
      { text: filter.error, tone: "red" },
      { text: filter.hint, tone: "dim" },
    ];
  }

  const platformUrl = resolvePlatformUrl();
  let outcome = await publishViaPlatform(session, platformUrl, filter.value, deps?.fetchImpl);

  if (outcome.status === "failed" && /Cannot reach platform|Platform 5/.test(outcome.reason)) {
    const supabase = resolveSupabase();
    if (supabase.value) {
      outcome = await publishSession(
        session,
        new SupabaseReportStore(supabase.value.url, supabase.value.key),
        filter.value,
      );
    }
  }

  return toReportLines(outcome);
}

function hasParams(routePath: string): boolean {
  return dynamicParams(routePath).length > 0;
}

function findEndpoint(
  endpoints: Endpoint[],
  method: string,
  path: string,
): { endpoint: Endpoint; paramDefaults: Map<string, string> | null } | null {
  // 1. Exact template match (covers literal `:param` input too).
  const exact = endpoints.find((endpoint) => endpoint.method === method && samePath(endpoint.path, path));
  if (exact) {
    if (path.includes(":")) return { endpoint: exact, paramDefaults: null };
    const defaults = concreteParamsForTemplate(exact.path, path);
    return { endpoint: exact, paramDefaults: defaults };
  }
  // 2. Concrete path against a :param template (e.g. /api/items/item-42).
  if (!path.includes(":")) {
    const templated = endpoints.find(
      (endpoint) => endpoint.method === method && templateMatches(endpoint.path, path),
    );
    if (templated) {
      return { endpoint: templated, paramDefaults: concreteParamsForTemplate(templated.path, path) };
    }
  }
  return null;
}

function runScan(rootDir: string): OutputLine[] {
  const lines: OutputLine[] = [
    { text: "Scanning project...", tone: "cyan" },
    { text: "", tone: "default" },
  ];

  try {
    const endpoints = scanEndpoints(rootDir);
    const groups = groupEndpointsByFile(endpoints);
    const middlewares = new Set(endpoints.flatMap((endpoint) => endpoint.middlewares ?? []));
    const schemas = scanSchemas(rootDir).reduce((count, file) => count + file.schemas.length, 0);

    lines.push(
      { text: `✓ Found ${groups.length} route files`, tone: "green" },
      { text: `✓ Found ${endpoints.length} endpoints`, tone: "green" },
      { text: `✓ Found ${middlewares.size} middleware`, tone: "green" },
      { text: `✓ Found ${schemas} schemas`, tone: "green" },
      { text: "", tone: "default" },
    );

    for (const group of groups) {
      lines.push({ text: `📂 ${group.sourceFile}`, tone: "cyan" });

      for (const endpoint of group.endpoints) {
        lines.push({ text: `${endpoint.method.padEnd(8)} ${endpoint.path}`, tone: "default" });
      }

      lines.push({ text: "", tone: "default" });
    }

    lines.push({ text: "Scan completed.", tone: "default" });
  } catch (error) {
    lines.push({
      text: `✖ Scan failed: ${error instanceof Error ? error.message : String(error)}`,
      tone: "red",
    });
  }

  return lines;
}

function runSchema(rootDir: string, args: string[]): OutputLine[] {
  const filter = parseFilterArgs(args, "schema");
  if (!filter.ok) {
    return [
      { text: filter.error, tone: "red" },
      { text: filter.hint, tone: "dim" },
    ];
  }

  try {
    const graph = buildApiGraph(rootDir);
    const visible = bodyEndpointNodes(graph);

    if (visible.length === 0 || !hasQuery(filter.value)) {
      return toSchemaLines(graph);
    }

    const matches = visible.filter((node) => matchesQuery(node.endpoint, filter.value));
    if (matches.length === 0) {
      return noMatchLines(
        filter.value,
        visible.map((node) => node.endpoint),
      );
    }

    return [
      {
        text: `Filter: ${describeQuery(filter.value)} — showing ${matches.length} of ${visible.length} body endpoints`,
        tone: "dim",
      },
      ...toSchemaLines({ ...graph, endpoints: matches }),
    ];
  } catch (error) {
    return [
      {
        text: `✖ Schema failed: ${error instanceof Error ? error.message : String(error)}`,
        tone: "red",
      },
    ];
  }
}

function runContext(rootDir: string, args: string[]): OutputLine[] {
  const filter = parseFilterArgs(args, "context");
  if (!filter.ok) {
    return [
      { text: filter.error, tone: "red" },
      { text: filter.hint, tone: "dim" },
    ];
  }

  try {
    const graph = buildKnowledgeGraph(rootDir);

    if (graph.endpoints.length === 0 || !hasQuery(filter.value)) {
      return toContextLines(graph);
    }

    const matches = graph.endpoints.filter((entry) =>
      matchesQuery({ method: entry.method, path: entry.endpoint }, filter.value),
    );

    if (matches.length === 0) {
      return noMatchLines(
        filter.value,
        graph.endpoints.map((entry) => ({ method: entry.method, path: entry.endpoint })),
      );
    }

    return [
      {
        text: `Filter: ${describeQuery(filter.value)} — showing ${matches.length} of ${graph.endpoints.length} endpoints`,
        tone: "dim",
      },
      ...toContextLines({ ...graph, endpoints: matches }),
    ];
  } catch (error) {
    return [
      {
        text: `✖ Context failed: ${error instanceof Error ? error.message : String(error)}`,
        tone: "red",
      },
    ];
  }
}

/**
 * Same honesty as /test: a filtered view never dead-ends without showing
 * what IS available. Falls back to the whole visible set when the queried
 * method has no candidates (e.g. `/schema GET` — body endpoints only).
 */
function noMatchLines(query: EndpointQuery, candidates: QueryableEndpoint[]): OutputLine[] {
  const method = query.method?.toUpperCase();
  const sameMethod = method ? candidates.filter((endpoint) => endpoint.method.toUpperCase() === method) : [];
  const pool = sameMethod.length > 0 ? sameMethod : candidates;
  const available = pool.slice(0, 5).map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`);

  return [
    { text: `No endpoint matches ${describeQuery(query)}.`, tone: "red" },
    {
      text: `${sameMethod.length > 0 && method ? `Available ${method}` : "Available"}: ${available.join(" · ")}`,
      tone: "dim",
    },
  ];
}
