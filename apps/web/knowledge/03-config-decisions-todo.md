---
title: Web Config Decisions TODO
tags:
  - sonicpoint
  - web
  - adr
  - todo
status: todo
source:
  - .env.example
  - next.config.mjs
  - src/app/globals.css
---

# Web Config, Decisions & TODO

## Env (`apps/web/.env.example` → `.env.local`)

**Client (boleh publik):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dipakai viewer read-only.

**Server-only (JANGAN pakai prefix `NEXT_PUBLIC_`, isi di Vercel Production):** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (route `/api/report`), `GEMINI_API_KEY` + `GEMINI_MODEL` + `GEMINI_MODEL_CANDIDATES` (route `/api/ai/payload`), `SONIC_POINT_REPORT_BASE_URL` (link report).

Tidak ada test runner web (`next lint` deprecated; verifikasi = `build + typecheck`).

## Decisions (Web-specific; global di Vault Root)

- **W-ADR-01**: FE tanpa Route Handler **data**; yang ada hanya 2 route server-only gerbang secret (`/api/ai/payload`, `/api/report`, lihat ADR-09 Root). Reason: CLI terbit ke npm tanpa key; viewer tetap read-only anon.
- **W-ADR-02**: Components presentational saja, tanpa state management. Reason: Server Components cukup untuk viewer.
- **W-ADR-03**: Tailwind v4 (`@import "tailwindcss"`, plugin via `@tailwindcss/postcss`). Tanpa `tailwind.config.js`.
- **W-ADR-04**: Semua page `force-dynamic`; Supabase client lazy (`getSupabase()`). Reason: data berubah tiap publish; `next build` harus lolos tanpa env (ADR-04 Root).

## TODO

| ID | Apa |
|---|---|
| W-01 | Fix B-01: link `← Sessions` kirim UUID, expect slug |
| W-02 | Verifikasi mirror `types/index.ts` vs SQL jika schema berubah |
| W-03 | `schemas` table belum dibaca Web — putuskan bareng CLI (U-01 Root) |

![[web-index.base]]
