---
title: Web Map
tags:
  - sonicpoint
  - web
  - map
status: active
source:
  - src/app/page.tsx
  - src/app/docs/[[...slug]]/page.tsx
  - src/app/report/[sessionId]/page.tsx
  - src/lib/docs.ts
---

# Web Map — landing, dokumentasi, report viewer

>Vault Web. Read-only. Kontrak DB canonical di `SonicPoint/knowledge/03-contracts.md` (Vault Root) — tidak diduplikat.

Rebuild fase-1 (Okt 2026): dashboard listing dihapus. Tiga muka:

- `/` — landing statis ala proyek open source (tanpa Supabase → prerender saat build).
- `/docs/[[...slug]]` — dokumentasi bahasa Indonesia dari file MDX, prerender saat build.
- `/report/[sessionId]` — viewer publik satu sesi (unlisted by UUID, tanpa auth), `force-dynamic`.

| Route | File | Data | Render | Lihat |
|---|---|---|---|---|
| `GET /` | `src/app/page.tsx` | tidak ada | statis `○` | [[01-pages]] |
| `GET /docs/[[...slug]]` | `src/app/docs/[[...slug]]/page.tsx` | `src/content/docs/*.mdx` via `lib/docs.ts` | SSG `●`, `dynamicParams = false` | [[01-pages]] |
| `GET /report/[sessionId]` | `src/app/report/[sessionId]/page.tsx` | `getSessionById + getEndpointsBySession` | `ƒ` force-dynamic | [[01-pages]] |
| 404 | `src/app/not-found.tsx` | — | statis | [[01-pages]] |
| `POST /api/report`, `POST /api/ai/payload` | `src/app/api/**` | `service_role` (server-only) | `ƒ` | W-ADR-01 |

Stack: Next.js 15 App Router + React 19 + Tailwind v4 (`@import "tailwindcss"`, plugin `@tailwindcss/postcss`, tanpa `tailwind.config.js`). Font Inter + JetBrains Mono via `next/font/google`; MDX hand-rolled: `next-mdx-remote/rsc` + `gray-matter` + `remark-gfm`.

## Token desain (ringkas — detail di `DESIGN.md` + `src/app/globals.css`)

- **Amber** (aksen): `lightning-yellow #ffe600`, `electric-gold #ffd000`, `amber-depth #a67c00`, `dark-amber #6b4e00`.
- **Netral**: `snow → silver-mist → smoke → graphite → slate → charcoal → ash → obsidian (#121212) → ink (#0d0d0d)`.
- **Fungsional (data saja)**: `ok`, `err`, `method-get/post/put/patch/delete/other` — dipakai chip method + status badge di report.
- Skala teks `text-caption…text-display` (+`text-code` untuk blok kode) sudah membawa line-height & tracking. Radius hanya `rounded-full`/`rounded-2xl`/`rounded-lg`. `max-w-page` = 1200px.
- Semua token WAJIB di blok `@theme` (yang di `:root` polos tidak menghasilkan utility).

## Verifikasi web (tidak ada test runner)

1. `pnpm --filter web typecheck`
2. `pnpm --filter web build` (harus lolos juga tanpa env Supabase — landing & docs statis)
3. Smoke manual: `next start -p 3002` lalu cek `/`, `/docs/quickstart`, `/report/<uuid>`. Tabel terminal di landing harus 44 kolom per baris box; anchor TOC docs harus sama dengan `id` heading.
