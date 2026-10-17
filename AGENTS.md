# AGENTS.md — SonicPoint (unified monorepo)

Gabungan `sonic-dashboard` + `sonic-point` lama. Satu `pnpm-workspace.yaml` di root.

## Layout

```
apps/web/src/
  app/                    # App Router: page.tsx (landing statis), docs/[[...slug]]/ (MDX statis),
                          # report/[sessionId]/ (force-dynamic), not-found.tsx, icon.svg
  components/             # presentational: SiteHeader/Footer, CodeBlock, MethodChip/StatusBadge,
                          # EndpointList (filter klien), mdx.tsx (map elemen MDX), ui.ts (kelas pill/card)
  content/docs/*.mdx      # konten dokumentasi (Indonesia); urutan halaman = docsNav di lib/docs.ts
  lib/
    supabase.ts           # getSupabase() — lazy client, JANGAN bikin eager
    queries.ts            # hanya untuk report: getSessionById, getEndpointsBySession
    docs.ts               # docsNav + pembaca MDX (gray-matter, slugify, TOC, prev/next)
    format.ts             # helper presentasi (JSON pretty, tanggal id-ID, latensi)
    site.ts               # konstanta identitas (nama, GitHub, npm, perintah install)
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
pnpm --filter web exec next dev -p 3002   # kalau :3000 dipakai app Express (kasus umum)
pnpm --filter web typecheck               # tsc --noEmit untuk apps/web
pnpm --filter sonic-point typecheck       # tsc src+bin+tests (tsconfig.test.json)
pnpm --filter sonic-point test            # node:test CLI via tsx
pnpm --filter sonic-point build           # clean + tsc → dist/
pnpm build                                # CLI + web (verifikasi sebelum commit)
```

Tidak ada test runner untuk web — belum ada test. `next lint` deprecated di Next 15; andalkan `build` + `typecheck` sebagai verifikasi web.

## Konvensi yang tidak obvious

- **Landing & docs statis; hanya report `force-dynamic`.** `/` dan `/docs/[[...slug]]` TIDAK boleh import Supabase — keduanya prerender saat build tanpa env. Jangan tambah `force-dynamic` di sana. `/report/[sessionId]` sebaliknya wajib `export const dynamic = "force-dynamic"`.
- **`/docs/[[...slug]]` memakai `dynamicParams = false`** — semua file `.mdx` dibaca saat build (fs runtime dengan path dinamis tidak ikut ter-trace Vercel, jadi jangan pernah melepas ini). Konsekuensi: slug tak dikenal → 404 benar, tapi `next start` menulis log `NoFallbackError` (quirk Next, bukan bug — jangan "perbaiki" dengan menghapus `dynamicParams`).
- **Docs engine hand-rolled:** `next-mdx-remote/rsc` + `gray-matter` + `remark-gfm`. Menambah halaman = file `.mdx` di `src/content/docs/` + entri di `docsNav` (`lib/docs.ts`) — build gagal kalau nav menunjuk file hilang. Judul h2/h3 harus teks polos; anchor & TOC dua-duanya lewat `slugify()` yang sama (jangan ubah sepihak).
- **Design system di `@theme` `globals.css`** (tema amber, dark-only, tanpa toggle). Token di `:root` polos tidak menghasilkan utility Tailwind — jangan letakkan warna/ukuran di sana. Radius hanya `rounded-full`/`rounded-2xl`/`rounded-lg`; weight maksimum 500; tanpa shadow/gradien. Warna fungsional (`ok`, `err`, `method-*`) hanya untuk data di report viewer. Aturan lengkap: `apps/web/DESIGN.md`.
- **Tidak ada listing project/session lagi.** Route `/projects/[projectId]` dihapus; viewer publik hanya `/report/[sessionId]` (unlisted by UUID, tanpa auth). Jangan hidupkan kembali query listing.
- **Supabase client web harus lazy (`getSupabase()`).** Eager `createClient` di module scope merusak `next build` saat env belum diisi. Query selalu lewat `queries.ts`.
- **Env web: client anon + server-only.** Client hanya `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only). Server-only (Vercel Production, jangan prefix `NEXT_PUBLIC_`): `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` + `GEMINI_MODEL`(+`_CANDIDATES`), `SONIC_POINT_REPORT_BASE_URL`. Lihat `.env.example` + ADR-09.
- **RLS: anon boleh SELECT, tidak boleh WRITE.** Write hanya lewat `service_role` — dipegang route `/api/report` di platform; CLI lokal tanpa key cuma bisa fallback menulis langsung kalau user memang punya service_role (mode advanced). Jangan tambah write policy untuk anon.
- **Schema SQL adalah contract web ↔ CLI.** Kalau ubah tabel/kolom di `supabase/migrations/`, update `apps/web/src/types/index.ts`, `apps/web/src/lib/queries.ts`, dan sisi CLI (`packages/cli/src/report/`) bersamaan. Tambah migration baru, jangan edit `001_` yang sudah di-apply.
- **FK body (`lahanId`) di-sampling, bukan dikarang.** Nilai id nyata diambil dari GET collection milik API user lalu di-cache di `.sonic-point.json` (`refs`: flat per noun + `host`, flag `stale` self-heal). Jangan pernah menjalankan POST producer untuk "membuat" data — kalau tak ada id, biarkan payload apa adanya dan laporkan 404 di report. Tulis cache hanya via `saveRefs()`. Detail: `knowledge/04-decisions.md` ADR-08 + `packages/cli/knowledge/02-run.md`.
- **Next.js 15: `params` adalah Promise.** Di dynamic routes selalu `const { x } = await params`, bukan akses langsung.
- **Tailwind v4** (`@import "tailwindcss"` di `globals.css`, plugin via `@tailwindcss/postcss`). Tidak ada `tailwind.config.js`.
- **Types FE dan CLI sengaja duplikat**, bukan shared package (keputusan desain). Sinkronisasi manual via schema SQL.
- **CLI rules:** `runSession()` returns data; spinners hanya via `RunOptions.events`. Never `console.*` di scan/run/report/ai/config. Library throw (`ScanError`, `RunError`); hanya `cli/commands.ts` yang catch + set `exitCode`. Test CLI pakai `node:test` + `node:assert/strict`, fixtures di `os.tmpdir()`, isolate provider writes dengan `SONIC_POINT_HOME` ke tmp.
- **Dependensi:** `@supabase/supabase-js` + `@types/node` disamakan versinya di kedua workspace. `typescript` sengaja beda major (web 5.x untuk Next 15, CLI 6.x). Jangan samakan TS.
