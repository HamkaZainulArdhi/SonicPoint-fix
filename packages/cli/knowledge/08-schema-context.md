---
title: Schema and Context — Implementation and Fix History
tags:
  - sonicpoint
  - cli
  - schema
  - context
  - history
status: active
source:
  - src/scan/schemas/scanSchemas.ts
  - src/scan/schemas/buildApiGraph.ts
  - src/scan/reports/formatSchema.ts
  - src/scan/reports/formatContext.ts
  - src/tui/views/schemaView.ts
  - src/tui/views/contextView.ts
  - tests/tui-schema.test.ts
  - tests/tui-context.test.ts
---

# Schema & Context — riwayat penerapan & fix (sesi Okt 2026)

> Detail format TUI terkini ada di [[07-tui-repl]]; keputusan arsitektur di [[05-decisions-todo]] (C-ADR-08, C-ADR-12, C-ADR-21). File ini hanya mencatat **apa yang dibangun, apa yang diperbaiki, dan jebakan yang terbukti** — bukan transkrip.

## Titik awal

Core scan (`routes/schemas/apiGraph/knowledge/symbols`, lihat [[01-scan]]) **sudah ada** sebelum sesi ini. Yang belum ada: render Stage-4, wiring TUI (`/schema`, `/context` masih stub), dan command-mode `scan --schema` masih format lama (`METHOD path [schema:Name]`).

## `/schema` — dibangun + diperbaiki

1. **`schemas.ts`**: `detectFramework` sebelumnya **hanya cek import AST** → file tanpa import eksplisit ke-skip diam-diam. Fix: cek content-string dulu (`Joi.`/`from "joi"`, `z.`/`from "zod"`, `Yup.`/`from "yup"`), fallback ke cek AST. Plus per-file try/catch (file rusak skip diam, debug opt-in `SONIC_DEBUG_SCHEMA=true`).
2. **`apiGraph.ts`** (aditif, `run/runner.ts` aman): link `{endpointId, schemaName, confidence:100, reason:"explicit-validation-middleware"}` + `links[]` + node `id/link/requiredFields` + threshold 50 untuk future fuzzy.
3. **Baru**: `scan/reports/formatSchema.ts` (pure formatter) → `tui/views/schemaView.ts` (kind→tone) + `cli/output.ts:renderSchemaReport`. `scan --schema` pindah ke format Stage-4 (satu formatter, dua sink — C-ADR-08).
4. **Test** `tui-schema.test.ts`: 9 test = acceptance 1–6 spek (link confidence 100, GET→`none`, POST tanpa schema→`unknown`, `validateBody` no-link, schema di luar 5 dir diabaikan, file rusak skip diam) + format + tones.
5. **Keputusan format**: contoh user menulis `[min(8)]`, core menghasilkan `[min: 8]` → diputuskan **pakai core** (user setuju, agar core + test existing tak berubah).

## `/context` — dibangun (core 100% reuse)

1. `knowledge.ts`/`symbols.ts` **tanpa perubahan** — 4 langkah spek (index → resolve lokal→import→global → trace rekursif + `visited` guard → dedup + auth + unresolved) sudah terpenuhi, termasuk confidence 86/90/82/88.
2. **Baru**: `scan/reports/formatContext.ts` → `tui/views/contextView.ts` + `cli/output.ts:renderContextReport`. `scan --context` pindah ke format contoh user (satu formatter, dua sink).
3. **Glow-up** (disetujui user): divider `─` per endpoint + `✓` green (ketemu) vs `◯` dim (absen) + endpoint ber-gap kuning full-line + urutan detail Controller→Service→Model→Schema→Auth (menyimpang dari contoh demi visual).
4. **Test** `tui-context.test.ts`: 5 test (chain penuh, gap eksplisit, **cycle A↔B terminate**, tones, empty graph).

## Fix & temuan jujur saat testing

- `output.ts`: duplikat import `KnowledgeGraph` — **ditangkap `typecheck`**, diperbaiki (import existing dipakai ulang).
- Typo `acheter` nyelip di test cycle — ketahuan saat review diff, langsung dibersihkan sebelum green.
- **Ekspektasi test salah, bukan bug core** (keduanya dibetulkan di test, core tak disentuh):
  - POST tanpa schema unresolved-nya `schema, controller, service, model` (core push `schema` untuk semua write-method — benar).
  - `cycleB.step` terklasifikasi **model** `Step`, bukan service — heuristik `inferModel` hanya anggap `*Service` (dkk) sebagai service. Fix test: pakai `aService`/`bService`. Batasan ini dicatat permanen di Root [[05-constraints]] C-08.
- Verifikasi akhir sesi: `typecheck` + `build` bersih, **52/52 test hijau**, e2e `scan --schema` + `scan --context` via `dist/` sesuai format.

## Filter `[METHOD] [PATH]` (lanjutan sesi Okt 2026)

1. **`/schema` & `/context` bisa spesifik ke satu method + endpoint** (request user): `/schema post /api/laporan`, `/schema POST`, `/context /api/laporan`, `/context GET /api/laporan/6775…` (cocok ke template `:param`).
2. **Parser + matcher murni baru**: `tui/repl/filterArgs.ts` (`parseFilterArgs(args, label)` + `matchesQuery` + `describeQuery`); `/report` kini delegasi ke parser yang sama — pesan error identik, tes report tak berubah. `samePath`/`templateMatches` diangkat dari `dispatchCommands.ts` (satu sumber).
3. **Output**: saat filter aktif, baris pertama dim `Filter: … — showing N of M body endpoints|endpoints`; tanpa argumen **byte-identik** dengan sebelumnya (tanpa baris filter). Header `/schema` kini plural-aware (`✔ Found 1 body endpoint`).
4. **No-match jujur bergaya `/test`**: `No endpoint matches …` (red) + `Available …` (dim, max 5); method tanpa kandidat fallback ke daftar visible (`/schema GET …` = no-match biasa, bukan pesan pintar — keputusan user).
5. **`/context` filtered**: `Endpoints:` mengikuti hasil filter; `Nodes/Edges/Unresolved` tetap global (bukan subgraph — dijelaskan baris filter).
6. **Test baru**: `repl.test.ts` +5 (parser/matcher/describe), `tui-schema.test.ts` +4, `tui-context.test.ts` +4 → **130/130 hijau**; typecheck + build bersih. Keputusan: C-ADR-21.

## Kontrak format (ringkas)

- `/schema`: header green `✔ Found N body endpoint(s)` (plural-aware); endpoint default (`METHOD` padEnd 7); divider dim; `Schema:` cyan / `unknown` yellow; `Required:` + `✓` green vs `Optional:` + `◯` dim; nama field padEnd per-schema; `type [enum, constraints, formats]` format core. Filter aktif → baris dim `Filter: … — showing N of M body endpoints` di atas header.
- `/context`: header green 4 baris sejajar (`Endpoints/Nodes/Edges/Unresolved`); endpoint default, gap yellow full-line + `[missing: …]`; divider dim; detail `✓` green vs `◯` dim (`none`/`not detected`); label padEnd 12. Filter aktif → baris dim `Filter: … — showing N of M endpoints`; `Endpoints:` = hasil filter, sisanya global.

## Sisa / belum pasti

- Parity command-mode: `scan --schema` / `scan --context` belum menerima argumen filter `[METHOD] [PATH]` (C-ADR-21; TUI dulu).
- Cek visual TTY sungguhan (Windows Terminal) untuk styling `/context` — automated test tak cover render Ink.
- Asumsi glyph `✓/◯` 1-cell diwarisi dari bukti `/schema`; aman sejauh ini.
- Sisa wiring REPL: `/test /report /config` (pola tinggal diulang).
