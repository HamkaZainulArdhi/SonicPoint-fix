// Command handlers — the only bridge between the REPL and SonicPoint Core.
// No business logic here: scan/schema/context/test all come from existing
// core (scanEndpoints, buildApiGraph, buildKnowledgeGraph, runSession).

import { scanEndpoints } from "../../scan/routes/scanEndpoints.js";
import { scanSchemas } from "../../scan/schemas/scanSchemas.js";
import { buildApiGraph } from "../../scan/schemas/buildApiGraph.js";
import { buildKnowledgeGraph } from "../../scan/knowledge/buildKnowledge.js";
import { ParsedInput, SLASH_COMMANDS } from "./commandRegistry.js";
import { OutputLine } from "./transcript.js";
import { groupEndpointsByFile } from "../views/scanView.js";
import { toSchemaLines } from "../views/schemaView.js";
import { toContextLines } from "../views/contextView.js";
import { toTestLines } from "../views/testView.js";
import {
  concreteParamsForTemplate,
  normalizePath,
  parseTestArgs,
} from "./testArgs.js";
import { loadCredentials } from "../../config/app.js";
import { resolveGeminiKey } from "../../config/providers.js";
import { SessionStore } from "../../config/sessions.js";
import { GeminiClient } from "../../ai/client.js";
import { Fetch } from "../../run/http.js";
import { dynamicParams } from "../../run/params.js";
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
      return { action: "append", lines: runSchema(rootDir) };
    case "context":
      return { action: "append", lines: runContext(rootDir) };
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
    default:
      return { action: "append", lines: [{ text: `/${name} is not implemented yet.`, tone: "yellow" }] };
  }
}

export interface RunTestDeps {
  fetchImpl?: Fetch;
}

/**
 * Full /test flow — the REPL equivalent of `sendCommand` (commands.ts).
 * Differences are deliberate and documented:
 * - AUTH gate: credentials must already exist (written by /config or `init`).
 *   Never prompts inside Ink (inquirer would steal the TTY).
 * - :param prompting: never prompts; unresolvable params become `skipped`
 *   results with a concrete-id hint (same honesty as GET in params.ts).
 * - No ora spinner (would fight Ink); ReplApp shows one static interim line.
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
  if (needsAi) {
    for (const w of resolveGeminiKey().warnings) warnings.push({ text: w, tone: "yellow" as const });
    const geminiKey = resolveGeminiKey();
    // Reuse the second call cost is negligible vs clarity; avoid divergent warnings.
    if (!geminiKey.value) {
      warnings.push(
        { text: "Gemini provider credential not configured.", tone: "yellow" },
        { text: "AI payload generation disabled — deterministic fallback will be used. Run /config to enable AI payloads.", tone: "dim" },
      );
    }
  }
  const gemini = resolveGeminiKey();

  try {
    const session = await runSession(targets, {
      rootDir,
      allEndpoints: endpoints,
      credentials,
      ai: gemini.value ? new GeminiClient(gemini.value) : null,
      // Never prompt inside the REPL — unresolvable :params become `skipped`.
      prompter: { askParam: async () => null },
      store: new SessionStore(rootDir),
      paramDefaults,
      fetchImpl: deps?.fetchImpl,
    });
    return [...warnings, ...toTestLines(session)];
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

function hasParams(routePath: string): boolean {
  return dynamicParams(routePath).length > 0;
}

function samePath(left: string, right: string): boolean {
  return normalizePath(left) === normalizePath(right);
}

function templateMatches(template: string, concretePath: string): boolean {
  const tSegs = template.split("/").filter(Boolean);
  const cSegs = concretePath.split("/").filter(Boolean);
  if (tSegs.length !== cSegs.length) return false;
  for (let i = 0; i < tSegs.length; i++) {
    if (tSegs[i].startsWith(":")) continue;
    if (tSegs[i] !== cSegs[i]) return false;
  }
  return true;
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

function runSchema(rootDir: string): OutputLine[] {
  try {
    return toSchemaLines(buildApiGraph(rootDir));
  } catch (error) {
    return [
      {
        text: `✖ Schema failed: ${error instanceof Error ? error.message : String(error)}`,
        tone: "red",
      },
    ];
  }
}

function runContext(rootDir: string): OutputLine[] {
  try {
    return toContextLines(buildKnowledgeGraph(rootDir));
  } catch (error) {
    return [
      {
        text: `✖ Context failed: ${error instanceof Error ? error.message : String(error)}`,
        tone: "red",
      },
    ];
  }
}
