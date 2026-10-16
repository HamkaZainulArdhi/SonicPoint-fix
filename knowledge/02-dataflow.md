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
    C -->|send: HTTP + auth + AI payload| S[session-cache.json]
    S -->|report: upsert project → open session → insert endpoints → close| DB[(Supabase)]
    DB -->|SELECT anon| W[Web Next.js]
    W -->|render| R[/report/:sessionId]
```

## Tahapan

1. **Scan** (lokal, tanpa network): `findCodeFiles → parseFile (Babel) → collectRouteFile → buildRouteTree → scanEndpoints`. Detail di Vault CLI.
2. **Send** (ke backend target user): `login → checkServer → resolvePath → resolvePayload → request → save cache`. Cache: `<root>/.sonic-point/session-cache.json`.
3. **Publish** (`publish.ts:38-47`): `upsertProject(slug) → openSession(running) → appendResults → closeSession(completed + totals)`. Filter opsional `method + path`. Tanpa store → `skipped`.
4. **Render** (`queries.ts`): `getProjects → getProjectBySlug → getSessionsByProject → getSessionById → getEndpointsBySession`. Read-only.

## Batas tanggung jawab

- CLI: menulis DB (service_role). Tidak pernah dibaca Web secara langsung.
- Supabase: satu-satunya backend. Tidak ada REST/Edge Function custom.
- Web: membaca DB (anon). Tidak pernah menulis.

> [!tip] AI guide
> Perubahan persistence → ubah `store.ts` + migrasi SQL + [[03-contracts]]. Perubahan tampilan → Vault Web saja.
