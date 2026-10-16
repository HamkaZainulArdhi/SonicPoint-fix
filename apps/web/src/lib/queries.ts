import { getSupabase } from "./supabase";
import type { Endpoint, Project, Session } from "@/types";

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("id, name, slug, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("id, name, slug, created_at, updated_at")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Project;
}

export async function getSessionsByProject(
  projectId: string,
): Promise<Session[]> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select(
      "id, project_id, status, started_at, finished_at, total_tested, total_success, total_failed, total_skipped, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load sessions: ${error.message}`);
  return (data ?? []) as Session[];
}

export async function getSessionById(
  sessionId: string,
): Promise<Session | null> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select(
      "id, project_id, status, started_at, finished_at, total_tested, total_success, total_failed, total_skipped, created_at",
    )
    .eq("id", sessionId)
    .single();

  if (error) return null;
  return data as Session;
}

export async function getEndpointsBySession(
  sessionId: string,
): Promise<Endpoint[]> {
  const { data, error } = await getSupabase()
    .from("endpoints")
    .select(
      "id, project_id, session_id, method, path, resolved_path, status_code, success, latency_ms, payload, response_preview, auth_used, ai_generated, error_message, execution_order, tested_at, created_at",
    )
    .eq("session_id", sessionId)
    .order("execution_order", { ascending: true });

  if (error) throw new Error(`Failed to load endpoints: ${error.message}`);
  return (data ?? []) as Endpoint[];
}
