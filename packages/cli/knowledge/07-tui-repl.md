---
title: Interactive REPL (TUI)
tags:
  - sonicpoint
  - cli
  - repl
  - tui
status: active
source:
  - src/tui/
  - src/config/sessions.ts
  - src/cli/program.ts
  - tests/repl.test.ts
  - tests/session-merge.test.ts
---

# Interactive REPL (TUI) — `sonic-point` tanpa argumen

> Penjelasan santai per folder/file: `src/tui/README.md`.

>Vault CLI. Perubahan arah UX: model menu-driven (Phase 1–2) **dihapus** karena tidak cocok untuk developer CLI tool. Pengganti: interactive REPL ala coding-agent prompt, TAPI SonicPoint bukan coding agent — AI tetap scoped request-data (lihat Constraints).

## Model interaksi

```
sonic-point
     ↓
Interactive REPL (prompt ›)
     ↓
/command + arguments
     ↓
SonicPoint Core (reuse, tanpa duplikasi)
     ↓
transcript output
     ↓
› (kembali otomatis, tanpa screen/back)
```

- Arrow keys: overlay terlihat → navigasi suggestion; selain itu → history submit sebelumnya ala shell (↑ mundur, ↓ maju, ↓ di ujung = buffer kosong). Termasuk `/test …` dkk — boleh.
- Manual typing selalu diizinkan; tidak ada select-menu paksa. Mengetik/Esc reset posisi browsing ke buffer live.
- Kontrak Enter: Enter melengkapi suggestion jika token belum lengkap (maks 2× Enter), Tab alias pelengkap, Esc dismiss.
- History session-only (cap 100, tanpa dedup, tanpa file); `/clear` tak menyentuhnya; flow `/config` kebal dari arrow (secret). Detail: [[05-decisions-todo]] C-ADR-18.
- Command mode (`scan/schema/send/report`) tidak berubah — REPL adalah interface tambahan.

## Struktur `src/tui/`

| File | Peran | Core yang dipakai |
|---|---|---|
| `shell/ReplApp.tsx` | Ink root: transcript + prompt `›` + dropdown suggestion | — (presentation only) |
| `shell/Home.tsx` | Banner + Project/Framework/Status ● Ready | `resolveProject` (via `runTui.ts`) |
| `shell/runTui.ts` | Entry `render()` + TTY guard | `resolveProject` |
| `repl/commandRegistry.ts` | Registry 8 command + parser + Enter-accept (murni, unit-tested) | — |
| `repl/dispatchCommands.ts` | Dispatch ke core (+ `runTest` async untuk `/test`; working session in-memory via `deps.store`) | `scanEndpoints`, `scanSchemas`, `groupEndpointsByFile`, `buildApiGraph`, `buildKnowledgeGraph`, `runSession` |
| `repl/testArgs.ts` | Parser strict `/test` — method wajib, bulk cuma GET (murni, unit-tested) | — |
| `repl/filterArgs.ts` | Parser lenient `[METHOD] [PATH]` + matcher — dipakai `/report`, `/schema`, `/context` (murni, unit-tested) | — |
| `repl/configForm.ts` | State machine `/config` 6 langkah + validasi + `draftToCredentials` (murni, unit-tested) | `loadCredentials/saveCredentials` shape (`config/app.ts`) |
| `repl/history.ts` | History shell-style ↑/↓ — push/navigasi/reset (murni, unit-tested) | — |
| `repl/transcript.ts` | Model scrollback, cap 200 entri | — |
| `views/scanView.ts` | `groupEndpointsByFile()` (dipakai `/scan`) | — |
| `views/schemaView.ts` | `toSchemaLines()` kind→tone (dipakai `/schema`) | `formatBodyEndpoints` (via `scan/reports/formatSchema.ts`) |
| `views/contextView.ts` | `toContextLines()` kind→tone (dipakai `/context`) | `formatContextGraph` (via `scan/reports/formatContext.ts`) |
| `views/testView.ts` | `toTestLines()` TestSession→tone (dipakai `/test`) | dual sink dari `cli/output.ts:renderSession` |
| `views/configView.ts` | `toConfigFlowLines()` + `displayDraftValue()` redact (dipakai `/config`) | kontrak file yang sama dengan `init` (`config/app.ts`) |

Slash commands: `/scan /schema /context /test /report /config /clear /quit` — high-level action saja. **Semua 8 ready** (`/report` selesai; `/routes` dan `/help` dihapus).

## Tema & tampilan (kontrak visual, keputusan user)

- Aksen Amber/Sonic: border Home + prompt `›` + highlight suggestion = `yellow` (bold); bolt logo `white`; divider Home `gray`. Lihat [[05-decisions-todo]] C-ADR-09.
- Palette suggestion floating asli: `position="absolute" bottom={1}` dalam wrapper prompt (drop-up), `backgroundColor="black"`, menutupi konten di atasnya. Bukan inline-flow (pernah dicoba, ditolak user). Lihat C-ADR-10.
- Tiap entry transcript diberi `marginBottom={1}` → 1 baris kosong antara respons tool dan prompt berikutnya.
- Home tips: `/scan` + `/schema` (tanpa `/routes`); hint `Type / to see all commands`. Guidance tanpa `/help`: input non-slash diarahkan ke `/scan`, `unknown` menampilkan daftar available dari registry.
- Bahasa visual report: divider `─` + `✓` green (ketemu) vs `◯` dim (absen) + endpoint ber-gap kuning. Lihat C-ADR-12.

## Status (per 2026-10-17)

- `/scan` menampilkan summary counts + **daftar endpoint grup per file** (`METHOD path`, format sama dengan command-mode `scan`).
- `/schema` menampilkan body endpoints (POST/PUT/PATCH) + schema ter-link + Required (✓) vs Optional (◯), format sama dengan command-mode `scan --schema`. Formatter murni di `scan/reports/formatSchema.ts` (satu sumber, dua sink: `cli/output.ts` + `tui/views/schemaView.ts`). Filter opsional `[METHOD] [PATH]`: `/schema post /api/laporan` → baris dim `Filter: … — showing N of M body endpoints` + header plural-aware; tanpa argumen identik dengan sebelumnya (C-ADR-21).
- `/context` menampilkan counts hijau + divider `─` per endpoint + detail `✓` (green, ketemu) vs `◯` (dim, `none`/`not detected`) + baris endpoint kuning full-line bila ada gap (`[missing: …]`). Urutan: Controller→Service→Model→Schema→Auth. Format sama dengan command-mode `scan --context`. Formatter murni di `scan/reports/formatContext.ts` (satu sumber, dua sink: `cli/output.ts` + `tui/views/contextView.ts`). Filter sama (`/context GET /api/laporan/6775…` cocok template `:param`); `Endpoints:` ikut filter, `Nodes/Edges/Unresolved` tetap global; no-match → `No endpoint matches …` + `Available …` (C-ADR-21).
- `/test` (method wajib): `/test GET` = semua GET; `/test POST /api/v1/lahan` = 1 endpoint. Bulk write ditolak (`/test POST` tanpa path → error). Detail: [[05-decisions-todo]] C-ADR-15/16.
  - AUTH gate: kredensial harus sudah ada (via `/config` atau `init`); tanpa kredensial → `Not configured — Run /config first` lalu berhenti. Tidak pernah prompt `inquirer` di Ink, secret tidak pernah masuk transcript.
  - `:id`: sampling otomatis dari GET collection sibling → nilai konkret eksplisit (`/test GET /api/items/item-42` via `RunOptions.paramDefaults`) → `skipped` jujur + hint id konkret. Bulk GET di-sort statis-dulu agar cache sampling siap.
  - **Sesi menumpuk (in-memory)**: hasil antar-run di-merge ke satu working session (`MergingSessionStore`, tanpa file) — kunci `METHOD + path` template; re-test = hasil terbaru menggantikan di posisi yang sama, `order` dinomori ulang 1..N, rentang waktu = union. Tiap run ditutup baris dim `Session so far: N endpoints — /report publishes all of them.` CLI ditutup (cara apa pun) = sesi hilang; tidak ada sisa cache. Detail: [[05-decisions-todo]] C-ADR-22.
  - Async: `ReplApp.submit` async + guard `isRunning` (satu run dalam satu waktu, anti double-send; pesan tolak generik `Already running — wait for it to finish.`). Entry interim dirender `<SpinnerLine label>`, bukan teks mati: frame braille `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` @80ms, **spinner amber + teks putih**, tanpa elapsed (`shell/Spinner.tsx`); otomatis diganti hasil asli saat run selesai (tidak pernah bocor ke transcript, `setInterval` dibersihkan). Tanpa `ora` di TUI (rebut stdout Ink).
  - FK body (`lahanId`): id di-sampling dari API user lalu di-cache di `.sonic-point.json` → baris notice dim prepend ke hasil: `↳ refs.lahan = <id> (saved)` / `↳ refs.lahan was stale — refreshed to <id>`. Sumber: `RunEvents.refSampled` + `run/refs.ts:refNotice`. Detail pipeline: [[02-run]], keputusan: C-ADR-19.
- `/config` (6 langkah, Ink-native): `Base URL → Login endpoint → Email → Password (masked) → Token field path → Token (opsional)`. Default = fallback existing `prompt.ts`; Enter = keep current. Validasi per langkah (URL http(s), endpoint diawali `/`, email/password wajib kalau token kosong). Tulis hanya di Step 6/6 via `saveCredentials` yang sama dengan `init` (byte-identical, `✔ Backend target config saved.`); tanpa probe network (keputusan user). `Esc` cancel tanpa tulis; `/clear` tengah-flow = cancel + clear (keputusan user); guard silang dengan `isRunning`. Password ter-mask (`•`) + ter-redact (`(set)`/`(empty)`). Detail: [[05-decisions-todo]] C-ADR-17.
- `/report` (async, guard sama dengan `/test`): working session REPL dulu (`deps.store.load()`), fallback ke `session-cache.json` hasil `send` kalau sitting masih kosong → `publishViaPlatform` (BE, `SONIC_POINT_PLATFORM_URL`) → fallback Supabase langsung kalau platform tak terjangkau dan key lokal ada. Filter `[METHOD] [PATH]`; entry interim `Publishing…` juga lewat `SpinnerLine`. Tidak mereset sesi — publish berulang boleh (C-ADR-22).
- `/clear /quit` bekerja (selalu menang walau ada run berjalan atau flow config). Non-TTY → pesan fallback ke command mode (exit 1, tidak hang).
- Tampilan `/config`: satu list 6 baris terpadu (`✓` done green / `?` aktif yellow / `?` mendatang dim), nilai selalu dalam parens ganda sebagai placeholder (Enter = pakai yang dalam kurung), tanpa counter `Step i/6`, tanpa hint; prompt zone satu baris `›`. Guidance hanya muncul saat validasi gagal (entry error red, self-contained).
- Verifikasi terakhir: `typecheck` (kini termasuk `tests/` via `tsconfig.test.json`) + `build` + `test` **142/142** hijau (130 existing + 12 baru — C-ADR-22: `mergeSessions`/`MergingSessionStore` di `session-merge.test.ts` + e2e akumulasi/replace/no-file/fallback di `tui-test.test.ts`); `scan --context` via dist terverifikasi e2e.
- Cek visual interaktif (TTY) dilakukan manual di Windows Terminal — tidak ter-cover automated test (kebijakan: render Ink tidak di-unit-test; hanya layer murni).
- Batasan sadar: input buffer append-only (tanpa cursor tengah-baris), transcript cap 200, daftar endpoint panjang tanpa paginasi, tanpa navigasi mundur di flow config (follow-up kecil).

## Follow-up (detail di [[05-decisions-todo]])

- Semua slash command sudah ter-wire ke core existing (`/scan`, `/schema`, `/context`, `/test`, `/report`, `/config`, `/clear`, `/quit`).
- Riwayat penerapan & fix `/schema` + `/context`: [[08-schema-context]].
- Kandidat lanjutan: notice FK untuk path param (`:lahanId`) supaya ikut persisten, bukan cuma body — resolver `run/refs.ts` sudah bisa dipakai ulang.
