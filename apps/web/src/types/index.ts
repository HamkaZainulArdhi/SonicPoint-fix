// FE-specific types. Mirror dari Supabase schema (supabase/migrations/).
// Sengaja tidak share dengan CLI — FE dan CLI punya definisi sendiri.

export type Project = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type SessionStatus = "running" | "completed" | "failed";

export type Session = {
  id: string;
  project_id: string;
  status: SessionStatus;
  started_at: string;
  finished_at: string | null;
  total_tested: number;
  total_success: number;
  total_failed: number;
  total_skipped: number;
  created_at: string;
};

export type Endpoint = {
  id: string;
  project_id: string;
  session_id: string;
  method: string;
  path: string;
  resolved_path: string;
  status_code: number | string | null;
  success: boolean;
  latency_ms: number;
  payload: Record<string, unknown> | null;
  response_preview: string | null;
  auth_used: string;
  ai_generated: boolean;
  error_message: string | null;
  execution_order: number;
  tested_at: string | null;
  created_at: string;
};

export type SchemaRecord = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  definition: Record<string, unknown>;
  endpoint_id: string | null;
  created_at: string;
};
