import ora, { Ora } from "ora";
import { scanEndpoints } from "../scan/routes/scanEndpoints.js";
import { scanSchemas } from "../scan/schemas/scanSchemas.js";
import { buildApiGraph } from "../scan/schemas/buildApiGraph.js";
import { buildKnowledgeGraph } from "../scan/knowledge/buildKnowledge.js";
import { collectSnippets } from "../scan/snippets/collectSnippets.js";
import { loadCredentials, saveCredentials } from "../config/app.js";
import { resolveGeminiKey, resolveSupabase, saveProviders } from "../config/providers.js";
import { resolvePlatformUrl } from "../config/platform.js";
import { SessionStore } from "../config/sessions.js";
import { GeminiClient } from "../ai/client.js";
import { RemoteAiClient } from "../ai/remote.js";
import { runSession } from "../run/runner.js";
import { publishSession } from "../report/publish.js";
import { publishViaPlatform } from "../report/remote.js";
import { SupabaseReportStore } from "../report/store.js";
import { selectTargets } from "./selection.js";
import { runTui } from "../tui/shell/runTui.js";
import { askCredentials, askParamValue, askSecret, askText } from "./prompt.js";
import {
  banner,
  fail,
  renderContextReport,
  renderEndpoints,
  renderPublishOutcome,
  renderRefNotices,
  renderSchemaReport,
  renderSchemas,
  renderSession,
  warn,
} from "./output.js";
import { Endpoint } from "../domain/endpoint.js";
import { SampledRef } from "../domain/ref.js";

export async function interactiveCommand(rootDir: string): Promise<void> {
  try {
    await runTui(rootDir);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

export async function scanCommand(rootDir: string, flags: { schema?: boolean; context?: boolean; snippets?: boolean }): Promise<void> {
  banner("SonicAPI Scanner anjayyyy");

  try {
    if (flags.context) {
      renderContextReport(buildKnowledgeGraph(rootDir));
      return;
    }

    if (flags.snippets) {
      console.log(JSON.stringify(collectSnippets(rootDir), null, 2));
      return;
    }

    if (flags.schema) {
      renderSchemaReport(buildApiGraph(rootDir));
      return;
    }

    renderEndpoints(scanEndpoints(rootDir));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

export async function schemaCommand(rootDir: string): Promise<void> {
  banner("SonicAPI Schemas");
  renderSchemas(scanSchemas(rootDir));
}

export async function initCommand(rootDir: string): Promise<void> {
  banner("SonicAPI Init");

  const credentials = await askCredentials(loadCredentials(rootDir));
  saveCredentials(rootDir, credentials);

  const gemini = resolveGeminiKey();
  const supabase = resolveSupabase();

  const geminiApiKey = gemini.value ?? (await askSecret("Gemini API key (optional):", ""));
  const supabaseUrl = supabase.value?.url ?? (await askText("Supabase URL (optional):", ""));
  const supabaseKey = supabase.value?.key ?? (await askSecret("Supabase key, service_role for publishing (optional):", ""));

  if (geminiApiKey.trim() || supabaseUrl.trim() || supabaseKey.trim()) {
    saveProviders({
      geminiApiKey: geminiApiKey.trim() || undefined,
      supabaseUrl: supabaseUrl.trim() || undefined,
      supabaseKey: supabaseKey.trim() || undefined,
    });
    console.log("✔ Provider credentials saved.");
  } else {
    warn("Provider setup skipped (no Gemini or Supabase credentials given).");
  }

  for (const warning of [...gemini.warnings, ...supabase.warnings]) {
    warn(warning);
  }

  console.log("✔ Backend target config saved.");
}

export async function sendCommand(
  rootDir: string,
  target: string | undefined,
  flags: { method?: string },
): Promise<void> {
  banner("SonicAPI Sender");

  let endpoints: Endpoint[];
  try {
    endpoints = scanEndpoints(rootDir);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  const selection = selectTargets(endpoints, { method: flags.method, path: target });

  if (!selection.ok) {
    fail(selection.error + (selection.hint ? `\nExample:\n${selection.hint}` : ""));
    return;
  }

  const credentials = loadCredentials(rootDir) ?? (await askCredentials(null));
  if (!loadCredentials(rootDir)) {
    saveCredentials(rootDir, credentials);
  }

  const gemini = resolveGeminiKey();
  for (const warning of gemini.warnings) warn(warning);

  // AI dari platform BE (baked URL) — juri tidak perlu punya key.
  // Key lokal (init/env) tetap didahulukan kalau ada (mode advanced).
  const platformUrl = resolvePlatformUrl();
  const ai = gemini.value ? new GeminiClient(gemini.value) : new RemoteAiClient(platformUrl);

  try {
    let spinner: Ora | null = null;
    const refNotices: SampledRef[] = [];

    const session = await runSession(selection.endpoints, {
      rootDir,
      allEndpoints: endpoints,
      credentials,
      ai,
      prompter: { askParam: askParamValue },
      store: new SessionStore(rootDir),
      events: {
        payloadStart: (endpoint) => {
          spinner = ora(`Generating AI payload for ${endpoint.method} ${endpoint.path}`).start();
        },
        payloadDone: (endpoint, source) => {
          spinner?.succeed(`Payload generated from ${source} for ${endpoint.method} ${endpoint.path}`);
          spinner = null;
        },
        refSampled: (ref) => refNotices.push(ref),
      },
    });

    renderRefNotices(refNotices);
    renderSession(session);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

export async function reportCommand(
  rootDir: string,
  method: string | undefined,
  target: string | undefined,
): Promise<void> {
  banner("SonicAPI Report");

  const session = new SessionStore(rootDir).load();

  if (!session) {
    fail("No cached session found. Run `sonic-point send` first.");
    return;
  }

  const supabase = resolveSupabase();
  for (const warning of supabase.warnings) warn(warning);

  // Publish via platform BE (tanpa key di CLI). Fallback ke Supabase
  // langsung hanya kalau platform tak terjangkau dan user punya key lokal.
  const platformUrl = resolvePlatformUrl();
  let outcome = await publishViaPlatform(session, platformUrl, { method, path: target });

  if (outcome.status === "failed" && /Cannot reach platform|Platform 5/.test(outcome.reason) && supabase.value) {
    outcome = await publishSession(
      session,
      new SupabaseReportStore(supabase.value.url, supabase.value.key),
      { method, path: target },
    );
  }

  if (!renderPublishOutcome(outcome)) {
    process.exitCode = 1;
  }
}
