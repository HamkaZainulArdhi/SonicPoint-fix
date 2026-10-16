# AGENTS.md — SonicPoint (unified monorepo)

Gabungan `sonic-dashboard` + `sonic-point` lama. Satu `pnpm-workspace.yaml` di root.

## Layout

```
apps/web/src/
  app/                    # App Router: page.tsx, projects/[projectId]/, report/[sessionId]/
  components/             # StatusBadge, EndpointTable (presentational saja)
  lib/
    supabase.ts           # getSupabase() — lazy client, JANGAN bikin eager
    queries.ts            # semua query DB, satu fungsi per kebutuhan page
  types/index.ts          # FE types, mirror schema SQL (sengaja tidak share dengan CLI)
packages/cli/
  bin/index.ts → src/cli/program.ts (commander wiring, thin)
  src/cli/commands.ts     # one handler per command; ONLY place that prints (via output.ts)
  src/cli/output.ts       # all console code. Domain/run/report never print.
  src/scan/ (core, routes, schemas, knowledge, snippets, reports per fitur)
  src/tui/ (shell, repl, views per fungsi) + src/run/ src/report/ src/config/ src/ai/ src/domain/
supabase/
  migrations/001_initial_schema.sql   # source of truth schema, jalankan berurutan
  seed.sql                            # dev data (fixed UUIDs)
```

## Commands (dari root)

```bash
pnpm install                              # install semua workspace
pnpm dev                                  # Next.js dev server (http://localhost:3000)
pnpm --filter web typecheck               # tsc --noEmit untuk apps/web
pnpm --filter sonic-point test            # node:test CLI via tsx
pnpm --filter sonic-point build           # clean + tsc → dist/
pnpm build                                # CLI + web (verifikasi sebelum commit)
```

Tidak ada test runner untuk web — belum ada test. `next lint` deprecated di Next 15; andalkan `build` + `typecheck` sebagai verifikasi web.

## Konvensi yang tidak obvious

- **Semua pages web `force-dynamic`.** Data berubah tiap CLI publish, jadi tidak ada static prerender. Jangan hapus `export const dynamic = "force-dynamic"` — build akan gagal tanpa Supabase env kalau dihapus.
- **Supabase client web harus lazy (`getSupabase()`).** Eager `createClient` di module scope merusak `next build` saat env belum diisi. Query selalu lewat `queries.ts`.
- **Env web hanya 2 var:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `apps/web/.env.local` (lihat `.env.example`). Tidak ada server-side secret — FE read-only via anon key.
- **RLS: anon boleh SELECT, tidak boleh WRITE.** Write hanya dari CLI pakai service_role key. Jangan tambah write policy untuk anon.
- **Schema SQL adalah contract web ↔ CLI.** Kalau ubah tabel/kolom di `supabase/migrations/`, update `apps/web/src/types/index.ts`, `apps/web/src/lib/queries.ts`, dan sisi CLI (`packages/cli/src/report/`) bersamaan. Tambah migration baru, jangan edit `001_` yang sudah di-apply.
- **Next.js 15: `params` adalah Promise.** Di dynamic routes selalu `const { x } = await params`, bukan akses langsung.
- **Tailwind v4** (`@import "tailwindcss"` di `globals.css`, plugin via `@tailwindcss/postcss`). Tidak ada `tailwind.config.js`.
- **Types FE dan CLI sengaja duplikat**, bukan shared package (keputusan desain). Sinkronisasi manual via schema SQL.
- **CLI rules:** `runSession()` returns data; spinners hanya via `RunOptions.events`. Never `console.*` di scan/run/report/ai/config. Library throw (`ScanError`, `RunError`); hanya `cli/commands.ts` yang catch + set `exitCode`. Test CLI pakai `node:test` + `node:assert/strict`, fixtures di `os.tmpdir()`, isolate provider writes dengan `SONIC_POINT_HOME` ke tmp.
- **Dependensi:** `@supabase/supabase-js` + `@types/node` disamakan versinya di kedua workspace. `typescript` sengaja beda major (web 5.x untuk Next 15, CLI 6.x). Jangan samakan TS.
