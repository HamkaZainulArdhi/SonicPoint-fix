---
title: Contracts (DB + RLS + API)
tags:
  - sonicpoint
  - contract
  - supabase
status: active
source:
  - supabase/migrations/001_initial_schema.sql
  - supabase/seed.sql
  - packages/cli/src/report/store.ts
  - apps/web/src/lib/queries.ts
  - apps/web/src/types/index.ts
---

# Contracts — canonical source of truth

> [!warning] Aturan
> Schema SQL adalah kontrak web ↔ CLI. Ubah tabel/kolom → update file ini + `apps/web/src/types/index.ts` + `apps/web/src/lib/queries.ts` + `packages/cli/src/report/` bersamaan. Tambah migrasi baru, jangan edit `001_` yang sudah di-apply.

## Tabel (001_initial_schema.sql)

- **projects** (`id uuid PK`, `name text`, `slug text UNIQUE`, `created_at`, `updated_at`). Upsert by `slug` (`store.ts:28-37`).
- **sessions** (`id uuid PK`, `project_id FK CASCADE`, `status CHECK(running,completed,failed) default running`, `started_at`, `finished_at NULL`, `total_tested/success/failed/skipped int default 0`, `created_at`). Index `sessions_project_id_idx`.
- **endpoints** (`id uuid PK`, `project_id FK`, `session_id FK`, `method`, `path`, `resolved_path`, `status_code text NULL`, `success bool default false`, `latency_ms int default 0`, `payload jsonb NULL`, `response_preview text NULL`, `auth_used default 'none'`, `ai_generated bool default false`, `error_message NULL`, `execution_order int`, `tested_at NULL`, `created_at`). Index `(session_id, execution_order)`, `project_id_idx`. Skipped = `status_code='SKIPPED'`.
- **schemas** (`id uuid PK`, `project_id FK`, `name`, `type`, `definition jsonb`, `endpoint_id FK NULL SET NULL`, `created_at`). Index `project_id_idx`. **Unused** — belum ada write/read (lihat [[05-constraints]]).

## RLS + Grants

```sql
-- Semua tabel: ENABLE ROW LEVEL SECURITY
-- Policy: FOR SELECT TO anon USING (true) — satu per tabel
-- Tanpa INSERT/UPDATE/DELETE policy untuk anon/authenticated
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON projects, sessions, endpoints, schemas TO anon;
```

Implikasi: CLI wajib `service_role` (`store.ts:22`). Web hanya `anon` (`supabase.ts:11-12`).

## API implisit

Tidak ada backend custom / Route Handler / Edge Function. API = PostgREST auto dari tabel:

- CLI writes: `projects.upsert`, `sessions.insert/update`, `endpoints.insert`.
- Web reads: 5 fungsi di `queries.ts` (`getProjects`, `getProjectBySlug`, `getSessionsByProject`, `getSessionById`, `getEndpointsBySession`), order `updated_at desc / created_at desc / execution_order asc`.

## Seed

`seed.sql`: fixed UUID (`...000001` project demo, `...000101` session completed 3/2/1/0, 3 endpoint rows GET/GET+param/POST-ai). `ON CONFLICT DO NOTHING`.

## AI guide

- Kolom baru → tambah ke `store.ts appendResults` + `queries.ts select` + `types/index.ts` + file ini.
- Jangan tambah write policy untuk anon.
- `status_code` bertipe `text` di DB (bukan int) — FE type `number | string | null`.
