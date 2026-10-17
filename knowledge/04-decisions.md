---
title: Architectural Decisions
tags:
  - sonicpoint
  - adr
status: active
source:
  - AGENTS.md
  - README.md
  - packages/cli/AGENTS.md
  - apps/web/src/lib/supabase.ts
---

# Architectural Decisions

## ADR-01 — Supabase IS the backend (no custom API server)

- Decision: CLI tulis langsung via `supabase-js`, Web baca langsung. Tidak ada `route.ts` / Edge Function.
- Reason: Report shareable tanpa auth server; RLS cukup. Mengurangi moving parts.
- Impact: Perubahan persistence di migrasi SQL, bukan di server. Jangan buat backend baru tanpa mengubah ADR ini.
- Source: `store.ts:21-25`, `queries.ts`, `001_initial_schema.sql:78-97`.
- Note (2026-10-17): tidak lagi utuh — jalur AI + publish kini lewat 2 Route Handler server-only di platform ([[#ADR-09 — Kunci AI + service_role tinggal di platform BE (bukan di CLI)]]). ADR ini tetap berlaku untuk **data/schema**: tidak ada API data custom, Web tetap baca langsung.

## ADR-02 — RLS anon SELECT-only, write via service_role

- Decision: Anon boleh SELECT, tidak boleh WRITE. CLI pegang service_role.
- Reason: URL report publik; credential DB tidak boleh di FE.
- Impact: Jangan tambah INSERT policy untuk anon. Service_role tidak pernah masuk `apps/web/.env.local`.
- Source: `001_initial_schema.sql:96-97`, `supabase.ts:20`.

## ADR-03 — Types FE dan CLI sengaja duplikat

- Decision: Tidak ada shared package. Sinkron manual via schema SQL.
- Reason: Keputusan desain (AGENTS.md). Menghindari coupling build.
- Impact: Ubah kolom → ubah dua tempat + kontrak [[03-contracts]].

## ADR-04 — Web force-dynamic + lazy Supabase client

- Decision: Semua pages `export const dynamic = "force-dynamic"`; client via `getSupabase()` cached singleton.
- Reason: Data berubah tiap publish; `next build` harus lolos tanpa env.
- Impact: Jangan hapus `force-dynamic`. Jangan `createClient` di module scope.
- Source: 3x `page.tsx:7`, `supabase.ts:8-25`.

## ADR-05 — CLI layering: hanya commands.ts boleh print

- Decision: `scan/run/report/ai/config` throw (`ScanError`, `RunError`), tanpa `console.*`. Spinner hanya via `RunOptions.events`. Warnings sebagai data `Resolved<T>`.
- Reason: Testability (`node:test`), output terpusat di `output.ts`.
- Impact: Jangan tambah `console.log` di domain/run/report.
- Source: `packages/cli/AGENTS.md`, `program.ts` (thin wiring).

## ADR-06 — TS beda major sengaja

- Decision: Web `typescript ^5.5.4` (Next 15), CLI `^6.0.3`. `@supabase/supabase-js` + `@types/node` disamakan.
- Reason: Next 15 belum support TS 6; dedup pnpm untuk supabase/node.
- Impact: Jangan samakan TS. Lihat README "Penyesuaian dependensi".

## ADR-07 — Interactive REPL sebagai interface tambahan CLI

- Decision: `sonic-point` tanpa argumen masuk REPL slash-command (Ink); command mode tidak berubah. Model menu-driven sempat dibangun (Phase 1–2) lalu dihapus — tidak cocok untuk developer CLI tool.
- Reason: Kecepatan interaksi (satu command jelas > multi-langkah select); backward compat wajib.
- Impact: TUI hanya presentation + interaction; reuse core (`scan/run/report`); AI tetap scoped request-data, bukan coding agent. Detail di Vault CLI `packages/cli/knowledge/07-tui-repl.md`.

## ADR-08 — Reference id (FK body) di-sampling + di-cache, TIDAK pernah dikarang/dibuat

- Decision: Field body yang menunjuk baris lain (`lahanId`, `user_id`, `plantAnalysisId`) diisi id **nyata** hasil sampling GET collection milik API user, disimpan sekali ke `.sonic-point.json` (`refs`, flat per noun + `host`). AI tidak pernah memutuskan nilai FK (nilai di-pin di prompt dan di-override setelah jawaban model).
- Reason: AI tidak tahu id yang ada di DB user — UUID karangan → `404 "Lahan tidak ditemukan"` (bukan bug scanner, tapi dependensi data). Sekali sampling = run berikutnya nol request tambahan.
- Impact: Aturan produk — **tidak pernah create** data untuk "menyiapkan" FK; kalau collection kosong, payload dibiarkan apa adanya dan 404 dilaporkan jujur. `stale` (404 pada id cache) → resample otomatis di run berikutnya. Jalur: `run/refs.ts` + `run/resources.ts` + `config/app.ts:saveRefs`; detail di Vault CLI `02-run.md` / `04-config.md`; keputusan CLI: C-ADR-19. Amandemen: deteksi not-found = status 404 ATAU teks Inggris (`not found`/`does not exist`) — frasa Indonesia dibuang agar suite tes netral (C-ADR-20 CLI).
- Source: `packages/cli/src/run/refs.ts`, `packages/cli/src/run/payloads.ts`, `packages/cli/tests/refs.test.ts` (+ e2e di `packages/cli/tests/refs-run.test.ts`).

## ADR-09 — Kunci AI + service_role tinggal di platform BE (bukan di CLI)

- Decision: CLI yang dipublikasikan **tanpa secret**. Payload AI dihasilkan lewat `POST /api/ai/payload` (Gemini server-side, failover rantai model) dan publish lewat `POST /api/report` (service_role ditulis di route). URL platform dibakar di CLI (`SONIC_POINT_PLATFORM_URL` untuk override saat dev).
- Reason: juri/user tidak boleh butuh Gemini key maupun Supabase service_role; anon key hanya untuk baca (ADR-02).
- Impact: Ini **menyempitkan** ADR-01 untuk jalur AI + publish (dua Route Handler server-only bertambah). CLI masih bisa fallback menulis Supabase langsung kalau platform tak terjangkau dan user punya key lokal (mode advanced). Jangan menaruh key di CLI/env yang ikut terbit ke npm.
- Source: `apps/web/src/app/api/ai/payload/route.ts`, `apps/web/src/app/api/report/route.ts`, `apps/web/src/lib/server.ts`, `packages/cli/src/config/platform.ts`.
