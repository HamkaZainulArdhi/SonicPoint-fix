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
