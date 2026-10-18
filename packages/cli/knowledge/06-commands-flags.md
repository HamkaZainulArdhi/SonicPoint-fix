---
title: CLI Commands and Flags
tags:
  - sonicpoint
  - cli
  - commands
  - flags
status: active
source:
  - src/cli/program.ts
  - src/cli/commands.ts
  - src/cli/selection.ts
---

# CLI Commands & Flags

>Referensi flag per command. Alur internal tiap command ada di [[00-cli-map]] + [[01-scan]] / [[02-run]] / [[03-report]] / [[04-config]].

Bin: `sonic-point`. Commander wiring tipis di `program.ts:4-46`; handler di `commands.ts`.

## `scan` — temukan endpoint

```
sonic-point scan [--schema | --context | --snippets]
```

| Flag | Fungsi yang jalan | Output |
|---|---|---|
| _(tanpa flag)_ | `scanEndpoints()` → `renderEndpoints()` | Daftar endpoint, grup per `sourceFile` |
| `--schema` | `buildApiGraph()` → `renderSchemaReport()` | Body endpoints + schema + Required (✓) vs Optional (◯), format sama dengan `/schema` |
| `--context` | `buildKnowledgeGraph()` → `renderContextReport()` | Counts + per-endpoint controller/service/model/schema/auth + `[missing: …]`, format sama dengan `/context` |
| `--snippets` | `collectSnippets()` | JSON ke stdout (`JSON.stringify(..., null, 2)`) |

> [!warning] Prioritas flag (bukan kombinasi)
> `commands.ts:33-52` cek berurutan: `context` → `snippets` → `schema` → default. Kalau gabung flag, yang menang yang paling atas. Contoh: `scan --context --schema` = mode context saja.

> [!note] Filter hanya di REPL
> `/schema` + `/context` versi REPL menerima `[METHOD] [PATH]` (C-ADR-21); command-mode `scan --schema / --context` belum — parity menyusul.

## `schema` — ekstrak skema validasi

```
sonic-point schema
```

Tanpa argumen/flag. `scanSchemas()` → `renderSchemas()` (per framework, per prop: type, required/optional, formats, constraints). Scope direktori lihat [[01-scan]].

## `init` — konfigurasi target + provider

```
sonic-point init
```

Interaktif, tanpa flag:

1. `askCredentials(loadCredentials())` → simpan `.sonic-point.json` (`baseUrl, loginEndpoint, email, password, tokenField, token?`).
2. `resolveGeminiKey() + resolveSupabase()` → yang masih null ditanya: `Gemini API key (optional)`, `Supabase URL (optional)`, `Supabase key, service_role for publishing (optional)`.
3. Kalau minimal satu diisi → `saveProviders()` ke `~/.sonic-point/providers.json` (bisa dioverride `SONIC_POINT_HOME`). Kalau kosong semua → warning `Provider setup skipped`.
4. Print warnings legacy + `✔ Backend target config saved.`

Detail prioritas env > file > legacy: [[04-config]].

## `send` — uji endpoint

```
sonic-point send [endpoint] [--method <method>]
```

| Bentuk | `selectTargets()` (`selection.ts`) | Hasil |
|---|---|---|
| `send` | tanpa method → semua `GET` | Scope default aman (tanpa write) |
| `send /api/items` | tanpa method → **argumen path diabaikan**, tetap semua `GET` | Perhatian: path tanpa `--method` tidak memfilter |
| `send --method POST /api/items` | method + path eksplisit, match `METHOD + normalized path` (strip trailing `/`) | Satu endpoint |
| `send --method POST` | error `An endpoint target is required with --method.` + hint | `fail()` |

Setelah seleksi: load/ask+save credentials → `resolveGeminiKey()` (null = warning box + fallback deterministik, bukan error) → `runSession(..., events: ora spinner payloadStart/Done)` → `renderRefNotices()` (baris dim `↳ refs.lahan = <id> (saved)` kalau ada FK baru di-cache) → `renderSession()` (tabel `cli-table3` + detail request/response). Lihat [[02-run]].

## `/test` (REPL) — uji endpoint, method wajib

```
/test GET                    → semua GET (bulk, hanya GET yang boleh bulk)
/test POST /api/v1/lahan     → tepat 1 endpoint
/test GET /api/items/item-42 → 1 endpoint, `:itemId` diisi `item-42` tanpa sampling
```

Bedanya dengan `send` (SENGAJA, lihat C-ADR-15/16 di [[05-decisions-todo]]):

| Bentuk | `/test` | `send` |
|---|---|---|
| tanpa argumen | error `method is required` + Usage | semua `GET` |
| `/api/items` tanpa method | error `Unknown method` | **diabaikan**, tetap semua `GET` |
| `POST` tanpa path | error `Write methods require a path` | error juga (`--method` butuh target) |
| `:param` tak ter-resolve | `skipped` + hint id konkret, tidak pernah prompt | prompt `inquirer` (non-GET) |
| tanpa kredensial | hard-block `Run /config first` | prompt `askCredentials` |

Prasyarat: `.sonic-point.json` sudah ada (via `/config` atau `init`). Bulk `GET` di-sort statis-dulu agar sampling `:param` dapat data. Hasil menumpuk ke working session **in-memory** (bukan `session-cache.json`) — tiap run ditutup baris dim `Session so far: N endpoints — /report publishes all of them.`; sesi hilang saat CLI exit. Satu run dalam satu waktu (`isRunning` guard). Lihat [[07-tui-repl]] + C-ADR-22 di [[05-decisions-todo]].

## `/schema` & `/context` (REPL) — view + filter opsional

```
/schema  [METHOD] [PATH]
/context [METHOD] [PATH]
```

| Bentuk | Hasil |
|---|---|
| tanpa argumen | semua endpoint (identik dengan command-mode) |
| `/schema POST` · `/context GET` | hanya method itu |
| `/context /api/laporan` | semua method di path itu |
| `/schema post /api/laporan` | 1 endpoint (method + path) |
| `/context GET /api/laporan/6775…` | cocok juga ke template `/api/laporan/:id` |

Matching case-insensitive + trailing slash dinormalisasi. Filter aktif → baris dim `Filter: … — showing N of M`; tanpa match → `No endpoint matches …` + `Available …` (max 5). `/schema` hanya body endpoint (POST/PUT/PATCH) — `/schema GET …` = no-match biasa. Parser bersama dengan `/report`: `tui/repl/filterArgs.ts` (C-ADR-21 di [[05-decisions-todo]]).

## `/config` (REPL) — konfigurasi target, gantikan `inquirer`

```
/config   → 6 langkah: Base URL → Login endpoint → Email → Password → Token field path → Token
```

Kontrak file identik dengan `init` (beda interface saja): default = fallback existing, Enter = keep current, tulis hanya di Step 6/6 via `saveCredentials` → `.sonic-point.json` + `✔ Backend target config saved.`. Tanpa probe network. `Esc` cancel tanpa tulis; `/clear` tengah-flow = cancel + clear; password ter-mask + ter-redact. Provider Gemini/Supabase tetap ranah `init` command-mode. Lihat C-ADR-17 di [[05-decisions-todo]] + [[07-tui-repl]].

## `report` — publish hasil cache

```
sonic-point report [method] [endpoint]
```

Keduanya positional opsional, dipakai sebagai filter `publishSession` (`publish.ts:28-32`):

| Bentuk | Arti |
|---|---|
| `report` | Publish seluruh session cache |
| `report GET` | Hanya hasil `GET` |
| `report POST /api/items` | Hanya `POST /api/items` (method di-uppercase, path dinormalisasi) |

Prasyarat: `SessionStore.load()` tidak null, kalau null → `fail("No cached session found. Run sonic-point send first.")`. Tanpa Supabase credentials → `skipped`. `exitCode = 1` jika `skipped/failed`. Mapping tulis ke DB: [[03-report]].

## Global

| Flag | Asal | Keterangan |
|---|---|---|
| `--help` | commander | Bantuan per command (`scan --help`) |
| `--version` | commander (`program.ts:7`, `2.0.0`) | Versi CLI |

## AI guide

- Tambah flag baru → `program.ts` (wiring) + `commands.ts` (handler) + catat di sini. Jangan logika berat di handler — delegasikan ke `scan/run/report/`.
- `send` tanpa `--method` mengabaikan path — itu perilaku aktual `selection.ts:9-11`, bukan bug dokumentasi.
