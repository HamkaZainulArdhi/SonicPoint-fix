import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TestResult } from "../domain/session.js";

/** Persistence port for published sessions (new Supabase schema). */
export interface ReportStore {
  readonly name: string;
  upsertProject(slug: string, name: string): Promise<{ id: string }>;
  openSession(projectId: string, startedAt: string): Promise<{ id: string }>;
  appendResults(projectId: string, sessionId: string, results: TestResult[]): Promise<number>;
  closeSession(
    sessionId: string,
    summary: { finishedAt: string; tested: number; passed: number; failed: number; skipped: number },
  ): Promise<void>;
  reportUrl(sessionId: string): string | undefined;
}

export class SupabaseReportStore implements ReportStore {
  readonly name = "supabase";
  private readonly client: SupabaseClient;

  constructor(url: string, key: string) {
    // service_role key required: anon can only SELECT (RLS).
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async upsertProject(slug: string, name: string): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from("projects")
      .upsert({ slug, name }, { onConflict: "slug" })
      .select("id")
      .single();

    if (error) throw new Error(`Project upsert failed: ${error.message}`);
    return { id: (data as { id: string }).id };
  }

  async openSession(projectId: string, startedAt: string): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from("sessions")
      .insert({
        project_id: projectId,
        status: "running",
        started_at: startedAt,
        finished_at: null,
        total_tested: 0,
        total_success: 0,
        total_failed: 0,
        total_skipped: 0,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Session open failed: ${error.message}`);
    return { id: (data as { id: string }).id };
  }

  async appendResults(projectId: string, sessionId: string, results: TestResult[]): Promise<number> {
    if (results.length === 0) return 0;

    const rows = results.map((result) =>
      result.kind === "executed"
        ? {
            project_id: projectId,
            session_id: sessionId,
            execution_order: result.order,
            method: result.method,
            path: result.path,
            resolved_path: result.resolvedPath,
            status_code: String(result.statusCode),
            success: result.success,
            latency_ms: result.latencyMs,
            payload: result.payload ?? null,
            response_preview: result.responsePreview ?? null,
            auth_used: result.auth,
            ai_generated: result.aiGenerated,
            error_message: result.error ?? null,
            tested_at: result.testedAt,
          }
        : {
            project_id: projectId,
            session_id: sessionId,
            execution_order: result.order,
            method: result.method,
            path: result.path,
            resolved_path: result.resolvedPath,
            status_code: "SKIPPED",
            success: false,
            latency_ms: 0,
            payload: null,
            response_preview: null,
            auth_used: "none",
            ai_generated: false,
            error_message: result.reason,
            tested_at: result.testedAt,
          },
    );

    const { error } = await this.client.from("endpoints").insert(rows);
    if (error) throw new Error(`Results insert failed: ${error.message}`);

    return rows.length;
  }

  async closeSession(
    sessionId: string,
    summary: { finishedAt: string; tested: number; passed: number; failed: number; skipped: number },
  ): Promise<void> {
    const { error } = await this.client
      .from("sessions")
      .update({
        status: "completed",
        finished_at: summary.finishedAt,
        total_tested: summary.tested,
        total_success: summary.passed,
        total_failed: summary.failed,
        total_skipped: summary.skipped,
      })
      .eq("id", sessionId);

    if (error) throw new Error(`Session close failed: ${error.message}`);
  }

  reportUrl(sessionId: string): string | undefined {
    const base = process.env.SONIC_POINT_REPORT_BASE_URL?.trim();
    if (!base) return undefined;

    return `${base.replace(/\/+$/, "")}/report/${sessionId}`;
  }
}
