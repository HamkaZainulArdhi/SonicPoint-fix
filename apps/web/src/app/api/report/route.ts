export const dynamic = "force-dynamic";

import { getReportBaseUrl, getServiceSupabase } from "@/lib/server";

interface SessionResult {
  kind?: string;
  order?: number;
  method?: string;
  path?: string;
  resolvedPath?: string;
  statusCode?: number | string;
  success?: boolean;
  latencyMs?: number;
  payload?: unknown;
  responsePreview?: string;
  auth?: string;
  aiGenerated?: boolean;
  error?: string;
  reason?: string;
  testedAt?: string;
}

interface ReportRequest {
  session?: {
    project?: { slug?: string; name?: string };
    startedAt?: string;
    finishedAt?: string;
    results?: SessionResult[];
  };
  filter?: { method?: string; path?: string };
}

/**
 * POST /api/report — publish a CLI test session.
 * The CLI holds no Supabase key; service_role lives here server-side.
 * Everything is stored: passed, failed (4xx/5xx/network errors) and
 * skipped — the report page already summarizes all four.
 * Body: { session: TestSession, filter?: { method, path } }
 */
export async function POST(req: Request): Promise<Response> {
  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return Response.json({ status: "failed", reason: "Invalid JSON body." }, { status: 400 });
  }

  const session = body.session;
  if (!session?.project?.slug || !Array.isArray(session.results)) {
    return Response.json({ status: "failed", reason: "Missing session.project.slug / results." }, { status: 400 });
  }

  const results = applyFilter(session.results, body.filter);
  if (results.length === 0) {
    return Response.json({ status: "skipped", reason: "No cached results matched the requested filter." }, { status: 200 });
  }

  try {
    const db = getServiceSupabase();
    const slug = session.project.slug;
    const projectId = await upsertProject(db, slug, session.project.name ?? slug);
    const sessionId = await openSession(db, projectId, session.startedAt);

    const now = new Date().toISOString();
    const { error: insertError } = await db
      .from("endpoints")
      .insert(results.map((result) => toRow(projectId, sessionId, result, now)));
    if (insertError) throw new Error(`Results insert failed: ${insertError.message}`);

    await closeSession(db, sessionId, session.finishedAt ?? now, summarize(results));

    return Response.json(
      {
        status: "published",
        receipt: {
          sessionId,
          published: results.length,
          reportUrl: `${getReportBaseUrl()}/report/${sessionId}`,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { status: "failed", reason: error instanceof Error ? error.message : "Unknown publish failure." },
      { status: 500 },
    );
  }
}

type Db = ReturnType<typeof getServiceSupabase>;

async function upsertProject(db: Db, slug: string, name: string): Promise<string> {
  const { data, error } = await db.from("projects").upsert({ slug, name }, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`Project upsert failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function openSession(db: Db, projectId: string, startedAt: string | undefined): Promise<string> {
  const { data, error } = await db
    .from("sessions")
    .insert({
      project_id: projectId,
      status: "running",
      started_at: startedAt ?? new Date().toISOString(),
      finished_at: null,
      total_tested: 0,
      total_success: 0,
      total_failed: 0,
      total_skipped: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Session open failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function closeSession(
  db: Db,
  sessionId: string,
  finishedAt: string,
  summary: { tested: number; passed: number; failed: number; skipped: number },
): Promise<void> {
  const { error } = await db
    .from("sessions")
    .update({
      status: "completed",
      finished_at: finishedAt,
      total_tested: summary.tested,
      total_success: summary.passed,
      total_failed: summary.failed,
      total_skipped: summary.skipped,
    })
    .eq("id", sessionId);
  if (error) throw new Error(`Session close failed: ${error.message}`);
}

function applyFilter(results: SessionResult[], filter?: { method?: string; path?: string }): SessionResult[] {
  const method = filter?.method?.toUpperCase();
  const path = filter?.path ? normalize(filter.path) : undefined;

  return results.filter((result) => {
    if (method && result.method !== method) return false;
    if (path && result.path && normalize(result.path) !== path) return false;
    return true;
  });
}

function toRow(projectId: string, sessionId: string, result: SessionResult, now: string): Record<string, unknown> {
  const base = {
    project_id: projectId,
    session_id: sessionId,
    execution_order: result.order ?? 0,
    method: result.method ?? "GET",
    path: result.path ?? "/",
    resolved_path: result.resolvedPath ?? result.path ?? "/",
    tested_at: result.testedAt ?? now,
  };

  if (result.kind !== "executed") {
    return {
      ...base,
      status_code: "SKIPPED",
      success: false,
      latency_ms: 0,
      payload: null,
      response_preview: null,
      auth_used: "none",
      ai_generated: false,
      error_message: result.reason ?? null,
    };
  }

  return {
    ...base,
    status_code: String(result.statusCode),
    success: result.success ?? false,
    latency_ms: result.latencyMs ?? 0,
    payload: (result.payload as Record<string, unknown> | null) ?? null,
    response_preview: result.responsePreview ?? null,
    auth_used: result.auth ?? "none",
    ai_generated: result.aiGenerated ?? false,
    error_message: result.error ?? null,
  };
}

function summarize(results: SessionResult[]): { tested: number; passed: number; failed: number; skipped: number } {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.kind !== "executed") skipped += 1;
    else if (result.success) passed += 1;
    else failed += 1;
  }

  return { tested: results.length, passed, failed, skipped };
}

function normalize(routePath: string): string {
  return routePath === "/" ? routePath : routePath.replace(/\/+$/, "") || "/";
}
