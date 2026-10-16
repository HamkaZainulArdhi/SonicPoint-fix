---
title: Components and Queries
tags:
  - sonicpoint
  - web
  - components
  - data
status: active
source:
  - src/components/EndpointTable.tsx
  - src/components/StatusBadge.tsx
  - src/lib/supabase.ts
  - src/lib/queries.ts
  - src/types/index.ts
---

# Components & Queries

## Supabase client (`lib/supabase.ts`) — lazy

`getSupabase()` + `cached` singleton. `createClient(url, anonKey, {auth:{persistSession:false, autoRefreshToken:false}})` saat pertama dipanggil. Error jelas (`Copy .env.example ke .env.local`) baru saat request — agar `next build` lolos tanpa env. Anon read-only.

## Queries (`lib/queries.ts`) — satu fungsi per page

| Fungsi | Query | Order |
|---|---|---|
| `getProjects()` | `projects(id,name,slug,created_at,updated_at)` | `updated_at desc`, throw on error |
| `getProjectBySlug` | `.eq(slug).single()` | return `null` → `notFound()` |
| `getSessionsByProject` | `sessions(...totals,created_at)` eq `project_id` | `created_at desc`, throw |
| `getSessionById` | sama, eq `id`, `.single()` | null on error |
| `getEndpointsBySession` | `endpoints(...)` eq `session_id` | `execution_order asc`, throw |

Tanpa cache/revalidate, tanpa client fetch, tanpa write. Kolom lengkap lihat kontrak Root.

## Components (presentational)

- **EndpointTable.tsx** `({endpoints: Endpoint[]})`: `# | Method | Path | Status | Latency`. `methodColor()`: GET sky, POST green, PUT/PATCH amber, DELETE red. `resolved_path` + sub-teks `path` jika beda. Empty: `No endpoints in this session.`
- **StatusBadge.tsx** `({success, statusCode})`: pill hijau `✓ <code>` / merah `✗ <code>`, `—` jika null.

## Types (`types/index.ts`)

`Project, Session(+SessionStatus running|completed|failed), Endpoint, SchemaRecord` — mirror SQL, sengaja duplikat dengan CLI (ADR-03 Root).

## AI guide

- Kolom baru → ubah `select` di sini + `types/index.ts` + kontrak Root + CLI `store.ts` bersamaan.
- `status_code` = `number | string | null` (DB `text`, CLI tulis `String(status)` / `'SKIPPED'`).
