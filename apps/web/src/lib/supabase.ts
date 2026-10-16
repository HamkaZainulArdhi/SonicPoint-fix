import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Lazy init: client dibuat saat pertama dipakai, bukan saat import.
// Ini penting agar `next build` tetap lolos walau env belum diisi —
// error yang jelas baru muncul saat page benar-benar di-request.
export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy apps/web/.env.example ke .env.local.",
    );
  }

  // Public read-only client (anon key). RLS di Supabase membuka SELECT untuk anon.
  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
