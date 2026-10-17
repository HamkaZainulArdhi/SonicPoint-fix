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

- **Amber** (satu-satunya aksen): `lightning-yellow #ffe600`, `electric-gold #ffd000`, `amber-depth #a67c00`, `dark-amber #6b4e00`. CTA tetap netral (`.btn-primary` fill `mist`, `.btn-ghost` obsidian) — amber bukan warna tombol.
- **Netral** (terang → gelap): `pure-white #ffffff → mist #e6e6e6 → ash #9c9c9d → smoke #6a6b6c → iron #454647 → hairline #363739 → slate #2f3031 → graphite #1b1c1e → obsidian #111214 → ink #07080a → void-black #040506`.
- **Fungsional (data saja)**: `ok`, `warn`, `err`, `method-get #56c2ff` (satu-satunya biru), `method-post/put/patch/delete/other` — dipakai chip method + badge status + lencana hasil. Merah hanya 4xx/5xx + DELETE.
- Skala teks `text-micro(10) tiny(11) mono(12) code(13) body-sm(14) body(16) subheading(18) title(20) heading-sm(24) heading(32) heading-lg(38) display(56)` — line-height/tracking menempel di token. Shadow keycap `shadow-key/key-hover/btn/window/well/orb/kbd/edge`. `max-w-page` = 1200px, `max-w-rail` = 1248px. Kelas kustom di `@layer components`: `glass-nav`, `btn-primary/ghost`, `key-card(-amber/-gold)`, `edge-card`, `icon-orb`, `kbd`, `badge(-amber/-gold)`, `input-well`, `window-frame`, `eyebrow`, `bg-tech-grid`, `bg-dot-matrix`, `section-beam`, `rail-crosshair`, `ghost-chip`, `hero-wash/bar`, `animate-flow`.
- Semua token WAJIB di blok `@theme` (yang di `:root` polos tidak menghasilkan utility). Nilai arbitrary (gradien/blur/mask) hanya di `globals.css`, bukan JSX.

## Verifikasi web (tidak ada test runner)

1. `pnpm --filter web typecheck`
2. `pnpm --filter web build` (harus lolos juga tanpa env Supabase — landing & docs statis)
3. Smoke manual: `next start -p 3002` lalu cek `/` (anchor `#preview #ast-lab #features #report-preview #compare #commands #faq` + teks hero + scroll-spy item navbar aktif mengikuti section), `/docs/quickstart` (MiniHeader + sidebar + anchor TOC = `id` heading), `/report/<uuid>` (MiniHeader + window-frame).
4. Viewer dengan data tiruan: build ulang dengan `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` + anon key dummy (env proses menang atas `.env.local`), jalankan mock REST Supabase, lalu `next start`; setelah selesai **build ulang bersih**. Ingat: satu `next start` per `.next`.
