---
title: Web Map
tags:
  - sonicpoint
  - web
  - map
status: active
source:
  - src/app/page.tsx
  - src/app/layout.tsx
  - src/app/projects/[projectId]/page.tsx
  - src/app/report/[sessionId]/page.tsx
---

# Web Map — shareable report viewer

>Vault Web. Read-only. Kontrak DB canonical di `SonicPoint/knowledge/03-contracts.md` (Vault Root) — tidak diduplikat.

Alur: `Home (list projects) → Project (list sessions) → Report (summary + endpoint table)`.

| Route | File | Data | Lihat |
|---|---|---|---|
| `GET /` | `src/app/page.tsx` | `getProjects()` → cards `Link /projects/[slug]` | [[01-pages]] |
| `GET /projects/[projectId]` (`slug`) | `src/app/projects/[projectId]/page.tsx` | `getProjectBySlug + getSessionsByProject`, `notFound()` jika null | [[01-pages]] |
| `GET /report/[sessionId]` (UUID) | `src/app/report/[sessionId]/page.tsx` | `getSessionById + getEndpointsBySession`, 4 stat cards + `EndpointTable` | [[01-pages]] |

Stack: Next.js 15 App Router + React 19 + Tailwind v4 (`@import "tailwindcss"`, tanpa `tailwind.config.js`). Semua Server Components `async`, `params: Promise` + `await params`.

Lihat data layer: [[02-components-queries]]. Config: [[03-config-decisions-todo]].

## AI guide

- Ubah tampilan → components saja. Ubah data → `lib/queries.ts` + kontrak Root.
- Route Handler yang ada (`app/api/ai/payload`, `app/api/report`) **server-only gerbang secret** (ADR-09 Root) — bukan API data, bukan untuk FE. Jangan tambah write dari sisi Web: FE tetap read-only via anon key (ADR-02).
