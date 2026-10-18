---
title: Report and Publish
tags:
  - sonicpoint
  - cli
  - report
status: active
source:
  - src/report/publish.ts
  - src/report/store.ts
  - src/report/remote.ts
  - src/config/sessions.ts
  - src/config/platform.ts
---

# Report & Publish

>Kontrak kolom canonical di `SonicPoint/knowledge/03-contracts.md` (Vault Root). Di sini hanya mapping fungsi → tabel.

## Jalur publish

1. **Default (tanpa key di CLI):** `publishViaPlatform(session, platformUrl, filter)` (`report/remote.ts`) → `POST {platform}/api/report {session, filter}`. Server yang pegang `service_role` (ADR-09 Root). Balikan diperlakukan sebagai `PublishOutcome` (`published` + `sessionId` + `reportUrl`).
2. **Fallback (advanced):** kalau platform tak terjangkau / 5xx **dan** user punya key Supabase lokal → `publishSession(...)` menulis langsung via `SupabaseReportStore`.
3. Semua hasil ikut terkirim: executed passed, executed failed (4xx/5xx/`ERROR` network), dan skipped — kartu summary report sudah punya empat angka.

## `publishSession(session, store|null, filter?)` (`publish.ts:16-47`)

- `store null` → `skipped (no Supabase)`.
- Filter `method.toUpperCase() + normalize path` (strip trailing `/`); 0 match → `skipped`.
- Sukses: `upsertProject(slug,name) → openSession(projectId,startedAt) → appendResults → closeSession(finishedAt+summarize)` → `{sessionId, published, reportUrl}`. Exception → `failed(reason)`.

## `SupabaseReportStore` (`store.ts`)

`createClient(url, key, {auth:{persistSession:false}})` — **service_role required** (`store.ts:22`).

| Fungsi | Tabel | Detail |
|---|---|---|
| `upsertProject` | `projects` | `upsert(slug,name onConflict:slug)` |
| `openSession` | `sessions` | `insert(running, total_*=0)` |
| `appendResults` | `endpoints` | executed: `status_code:String(status),success,latency_ms,payload,response_preview,auth_used,ai_generated`; skipped: `status_code:'SKIPPED',success:false,latency 0,error=reason` |
| `closeSession` | `sessions` | `update(completed + totals)` |
| `reportUrl` | — | `SONIC_POINT_REPORT_BASE_URL/report/:id`, `undefined` jika env unset |

## `SessionStore` (`config/sessions.ts`)

`<root>/.sonic-point/session-cache.json` (`{session}`). In-memory fallback jika tanpa `rootDir`. **Jembatan `send → report`** (satu-satunya penulis file). `load()` return `undefined` on parse fail → CLI fail `run send dulu`. REPL tidak memakai file: `MergingSessionStore` (subclass, tanpa `rootDir`) menumpuk working session in-memory via `mergeSessions()` — hilang saat exit; `/report` membacanya dulu sebelum fallback ke file ini. Detail: C-ADR-22 di [[05-decisions-todo]].

## AI guide

- Tambah kolom → ubah `appendResults` + kontrak Root + Web `queries.ts` + `types/index.ts` bersamaan.
- Jangan simpan service_role di repo. `reportUrl` tanpa env = `undefined` (bukan error).
