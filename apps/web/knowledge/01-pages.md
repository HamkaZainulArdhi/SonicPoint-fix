---
title: Pages and Routing
tags:
  - sonicpoint
  - web
  - routing
status: active
source:
  - src/app/page.tsx
  - src/app/layout.tsx
  - src/app/projects/[projectId]/page.tsx
  - src/app/report/[sessionId]/page.tsx
---

# Pages & Routing

Semua pages `export const dynamic = "force-dynamic"` — render per-request, cegah prerender gagal tanpa env.

## `/` — `src/app/page.tsx`

`getProjects()` → grid cards `Link /projects/[slug]`. Empty-state arahkan ke `sonic-point send + report`.

## `/projects/[projectId]` — slug, bukan UUID

`getProjectBySlug(slug) + getSessionsByProject(project.id)`; `notFound()` jika null; tiap session `Link /report/[session.id]`; `← Projects` ke `/`.

## `/report/[sessionId]` — UUID `sessions.id`

`getSessionById + getEndpointsBySession`; `notFound()` jika null; 4 stat cards (`tested/passed/failed/skipped`) + `<EndpointTable/>`.

> [!bug] B-01 slug vs UUID
> `report/[sessionId]/page.tsx:23` link `← Sessions` ke `/projects/${session.project_id}` (UUID), tapi project page expect `slug` → `notFound()`. Fix: resolve slug via project atau ubah route terima UUID. Earmark di [[03-config-decisions-todo]].

## Layout — `src/app/layout.tsx`

Header `⚡ sonic-point test reports`, `max-w-5xl`, `bg-gray-50`. Metadata `Sonic Point — API Test Reports`.
