---
title: Glossary
tags:
  - sonicpoint
  - glossary
status: active
source:
  - supabase/migrations/001_initial_schema.sql
  - apps/web/src/types/index.ts
  - packages/cli/src/domain/session.ts
---

# Glossary (canonical)

| Istilah | Arti | Kunci |
|---|---|---|
| Project | Grup logis hasil scan/test. `slug` unique, dipakai CLI upsert; web tidak lagi menampilkan listing project (fase-1). | `projects.slug` |
| Session | Satu run `sonic-point send` yang di-publish via `report`. Status `running → completed`. `failed` ada di CHECK tapi `closeSession` selalu tulis `completed`. | `sessions.status` |
| Endpoint (row) | Satu baris per endpoint per session. Full history, no upsert. `path` = template (`/api/items/:itemId`), `resolved_path` = konkret (`/api/items/item-42`). | `endpoints.session_id + execution_order` |
| Skipped | Hasil yang tidak di-request (param dinamis / tanpa payload). Disimpan sebagai `status_code='SKIPPED'`, `success=false`, `latency_ms=0`. | `store.ts:88-96` |
| Schema | Definisi validasi Joi/Zod/Yup. Tabel ada, tapi **belum ada insert/select di CLI/Web** — lihat [[05-constraints]]. | `schemas` |
| Report URL | `${SONIC_POINT_REPORT_BASE_URL}/report/:sessionId`. `undefined` jika env unset. | `store.ts:125-130` |
| Reference id (`refs`) | Id **nyata** untuk FK body (`lahanId`) hasil sampling GET collection user, di-cache di `.sonic-point.json` per noun + `host`; `stale` = 404 terakhir → resample run berikutnya. Tidak pernah dikarang AI, tidak pernah dibuatkan datanya. | ADR-08; `run/refs.ts` |
| Platform BE | Deployment Next.js pemegang secret: `/api/ai/payload` (Gemini) + `/api/report` (service_role). CLI terbit tanpa key. | ADR-09 |
| Shareable | Report bisa dibuka tanpa login (anon SELECT). | RLS di [[03-contracts]] |

Lihat aliran: [[02-dataflow]]. Kontrak kolom: [[03-contracts]].
