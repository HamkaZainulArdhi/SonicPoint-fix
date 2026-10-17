---
title: Web Config Decisions TODO
tags:
  - sonicpoint
  - web
  - adr
  - todo
status: active
source:
  - .env.example
  - next.config.mjs
  - src/app/globals.css
  - src/app/report/[sessionId]/page.tsx
---

# Web Config, Decisions & TODO

## Env (`apps/web/.env.example` → `.env.local`)

**Client (boleh publik):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dipakai viewer read-only. **Di-inline saat build** (DefinePlugin): ganti nilainya = rebuild, bukan cukup restart `next start`.

**Server-only (JANGAN pakai prefix `NEXT_PUBLIC_`, isi di Vercel Production):** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (route `/api/report`), `GEMINI_API_KEY` + `GEMINI_MODEL` + `GEMINI_MODEL_CANDIDATES` (route `/api/ai/payload`), `SONIC_POINT_REPORT_BASE_URL` (link report + `metadataBase`).

Tidak ada test runner web (`next lint` deprecated; verifikasi = `build + typecheck` + smoke manual di [[00-web-map]]).

## Decisions (Web-specific; global di Vault Root)

- **W-ADR-01**: FE tanpa Route Handler **data**; yang ada hanya 2 route server-only gerbang secret (`/api/ai/payload`, `/api/report`, lihat ADR-09 Root). Reason: CLI terbit ke npm tanpa key; viewer tetap read-only anon.
- **W-ADR-02** *(diamandemen)*: Components presentational, **state UI lokal (`useState`) diizinkan** untuk filter/search report (W-ADR-08) dan interaksi landing (tab REPL, toggle pkg manager, accordion, FAQ); tanpa state library, tanpa client fetch, tanpa komunikasi antar-island — tiap island mandiri. Reason: Server Components cukup untuk data; interaksi murni dalam memori.
- **W-ADR-03**: Tailwind v4 (`@import "tailwindcss"`, plugin via `@tailwindcss/postcss`). Tanpa `tailwind.config.js`.
- **W-ADR-04** *(diamandemen)*: Hanya `/report/[sessionId]` yang `force-dynamic`; landing `/` dan `/docs/[[...slug]]` **statis**. Supabase client tetap lazy (`getSupabase()`) dan hanya diimpor dari page report. Reason: rebuild fase-1 menjadikan landing + docs konten statis; `next build` tetap harus lolos tanpa env (ADR-04 Root).
- **W-ADR-05** *(diamandemen)*: Desain "Midnight + Amber" dark-only di blok `@theme` `globals.css` (tanpa toggle tema). Satu aksen amber untuk aksen teknis (logo, prompt, tab aktif, badge, kartu kunci) — CTA tetap netral (`btn-primary` fill `mist`, `btn-ghost` obsidian). Warna fungsional (`ok`, `warn`, `err`, `method-*`) hanya saat membawa status/hasil; merah hanya 4xx/5xx + DELETE, biru hanya chip GET. Reason: satu sumber nilai untuk seluruh surface + utility Tailwind ter-generate. Detail: `DESIGN.md`.
- **W-ADR-09**: Konten landing terpusat di `src/lib/landing.ts` sebagai model segmen (`Seg`/`Line`, tone eksplisit) yang dirender `Segs.tsx`; tiap section punya file + `Section` shell sendiri (`components/landing/*`). Reason: revisi copy/wording tidak menyentuh JSX dan setiap section tetap server component statis.
- **W-ADR-06**: Dokumentasi hand-rolled MDX (`next-mdx-remote/rsc` + `gray-matter` + `remark-gfm`), tanpa shiki/contentlayer. `docsNav` di `lib/docs.ts` = satu sumber urutan & slug (slug = nama file); bahasa konten **Indonesia**. `dynamicParams = false` + semua baca file saat build. Reason: kontrol penuh atas gaya DESIGN; fs runtime dengan path dinamis tidak ikut ter-trace Vercel, jadi konten harus rampung sebelum request.
- **W-ADR-07**: Landing statis tanpa Supabase (satu halaman, tanpa data) + `not-found.tsx` global; route `/projects/[projectId]` dan semua query listing **dihapus** — viewer tetap unlisted by UUID tanpa auth. Reason: landing OSS + docs adalah fokus fase-1; listing lama tak punya pemilik (B-01 jadi moot).
- **W-ADR-08**: Report viewer bergaya Swagger: satu kolom, baris endpoint `<details>` native (tanpa JS framework), toolbar filter client (`EndpointList`), chip method + status badge berwarna fungsional. Reason: perilaku accordion gratis + SEO/SSR utuh; filter tak butuh persistensi.
- **W-ADR-10**: Header per-surface — nav kaca mengapung (`SiteHeader`) **hanya** di landing (anchor section + scroll-spy `IntersectionObserver`, `aria-current`); `/docs` & `/report` memakai `MiniHeader` statis (logo → `/`, GitHub, "Beranda") supaya chrome landing tidak menempel di halaman konten. Brand navbar = `app/icon.png` (tanpa teks/badge versi); CTA kanan = "Dokumentasi" → `/docs` (bukan salin install — `InstallButton` tinggal di `BottomCta`). Reason: docs/report punya konteks sendiri (sidebar/TOC, laporan publik) dan offset anchor-nya beda (`scroll-padding-top: 24px` + `scroll-mt-[72px]` hanya di section landing).

## Quirk yang sudah diverifikasi (jangan "diperbaiki" buta)

- `/docs/<slug-tak-dikenal>` → 404 benar, tapi `next start` menulis log `Error: Internal: NoFallbackError` (jalur short-circuit `dynamicParams = false` di Next 15.5). Kosmetik — biarkan.
- Dua `next start` dari `.next` yang sama saling merusak (`Cannot find module './NNN.js'`). Satu instance per build.
- `NEXT_PUBLIC_*` di-inline saat build → untuk smoke test viewer dengan backend tiruan, suntik env mock saat `next build`; jangan ganti `.env.local` user.
- `tsconfig.tsbuildinfo` (ter-track git) bisa basi → `tsc`/`next build` melaporkan error hantu ("Cannot find name X" padahal import ada). Hapus file itu lalu ulangi; jangan "perbaiki" kode yang sebenarnya benar.

## TODO

| ID | Apa |
|---|---|
| ~~W-01~~ | ~~Fix B-01 (link UUID vs slug)~~ — moot: route `/projects` dihapus (W-ADR-07) |
| W-02 | Verifikasi mirror `types/index.ts` vs SQL jika schema berubah |
| W-03 | `schemas` table belum dibaca Web — putuskan bareng CLI (U-01 Root) |
| W-04 | Docs `instalasi` menyebut `Node.js ≥ 22`; selaraskan dengan `engines` CLI bila naik |

![[web-index.base]]
