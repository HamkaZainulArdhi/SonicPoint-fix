import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceCached: SupabaseClient | null = null;

/**
 * Server-only Supabase client (service_role). NEVER import this from
 * client components or expose the key to the browser. The CLI (npm)
 * never holds this key — it POSTs to /api/report and the route writes here.
 */
export function getServiceSupabase(): SupabaseClient {
  if (serviceCached) return serviceCached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (server env, set in Vercel).");
  }

  serviceCached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceCached;
}

export interface GeminiConfig {
  apiKey: string;
  /** Model dicoba pertama. Default dari ENV (wajib di ENV, fallback kode). */
  defaultModel: string;
  /** Kandidat failover berurutan kalau default limit/error. */
  candidates: string[];
}

/** Default kode — ENV selalu menang (GEMINI_MODEL / GEMINI_MODEL_CANDIDATES). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export const GEMINI_MODEL_CANDIDATES = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
];

/** Gemini config (Google AI). Server-only — key tidak pernah ke CLI/browser. */
export function getGeminiConfig(): GeminiConfig | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const extra = (process.env.GEMINI_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  // Default ENV didahulukan, duplikat dibuang, default kode jadi jangkar terakhir.
  const chain = [fromEnv || DEFAULT_GEMINI_MODEL, ...extra, ...GEMINI_MODEL_CANDIDATES].filter(Boolean);
  const models = [...new Set(chain)];

  return { apiKey, defaultModel: models[0], candidates: models };
}

/** Base URL for shareable /report/:id links. */
export function getReportBaseUrl(): string {
  const explicit = process.env.SONIC_POINT_REPORT_BASE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "https://sonicpoint.vercel.app";
}
