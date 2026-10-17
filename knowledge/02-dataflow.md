---
title: Dataflow
tags:
  - sonicpoint
  - dataflow
status: active
source:
  - README.md
  - packages/cli/src/report/publish.ts
  - packages/cli/src/report/store.ts
  - apps/web/src/lib/queries.ts
---

# Dataflow (canonical)

```mermaid
graph LR
    U[Express codebase user] -->|scan AST| C[CLI scan]
    C -->|GET sample id + HTTP test| U
    C -->|prompt payload| P[Platform BE]
    P -->|Gemini, service_role| DB[(Supabase)]
    C -->|POST /api/report| P
    C -->|refs cache + session cache| F[.sonic-point.json]
    DB -->|SELECT anon| W[Web Next.js]
    W -->|render| R[/report/:sessionId]
```

## Tahapan

1. **Scan** (lokal, tanpa network): `findCodeFiles → parseFile (Babel) → collectRouteFile → buildRouteTree → scanEndpoints`. Detail di Vault CLI.
2. **Send** (ke backend target user): `login → checkServer → resolvePath → resolvePayload → request → save cache`. Write body: reference id (`lahanId`) di-sampling dari GET collection user lalu di-cache di `.sonic-point.json` (`refs`) — tanpa itu AI mengarang id → 404 (ADR-08). Payload AI sendiri minta ke platform (`POST /api/ai/payload`). Cache session: `<root>/.sonic-point/session-cache.json`.
3. **Publish**: `POST /api/report` di platform → `upsertProject(slug) → openSession(running) → appendResults → closeSession(completed + totals)` (passed + failed + skipped). Filter opsional `method + path`. Fallback: Supabase langsung kalau platform tak terjangkau dan user punya key lokal (ADR-09). Tanpa store → `skipped`.
4. **Render** (`queries.ts`): `getProjects → getProjectBySlug → getSessionsByProject → getSessionById → getEndpointsBySession`. Read-only.

## Batas tanggung jawab

- CLI: menembak backend target user + mengirim session ke platform. Tanpa key (AI/service_role tinggal di platform, ADR-09).
- Platform BE: satu-satunya pemegang secret; menulis DB via service_role.
- Supabase: satu-satunya persistence. Tidak ada API data custom (ADR-01).
- Web: membaca DB (anon). Tidak pernah menulis.

> [!tip] AI guide
> Perubahan persistence → ubah `store.ts` + migrasi SQL + [[03-contracts]]. Perubahan tampilan → Vault Web saja. Perubahan cara mengisi body → Vault CLI `02-run.md`.
