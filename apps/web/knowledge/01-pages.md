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
  - src/app/docs/[[...slug]]/page.tsx
  - src/app/report/[sessionId]/page.tsx
  - src/app/not-found.tsx
  - src/lib/docs.ts
---

# Pages & Routing

Aturan render: `/` dan `/docs/**` **statis** (tidak boleh import Supabase — build lolos tanpa env); hanya `/report/[sessionId]` yang `force-dynamic`. Route lama `/projects/[projectId]` dihapus (tanpa listing project/session; B-01 jadi moot).

## Layout — `src/app/layout.tsx`

Shell global: `SiteHeader` (sticky 64px, border-b charcoal) → `<main className="flex-1">` → `SiteFooter`; `body` flex kolom `min-h-screen`. Font: Inter + JetBrains Mono (`next/font/google`, variabel dipasang di `<html>`). Metadata: title template `%s · SonicPoint`, `metadataBase` dari `SONIC_POINT_REPORT_BASE_URL` (fallback `https://sonicpoint.vercel.app`). `lang="id"`. `app/icon.svg` = bolt amber di kotak obsidian.

## `/` — `src/app/page.tsx` (statis)

Landing tanpa data, urutan section: hero (eyebrow pill, H1 dua baris dengan baris kedua amber, subjudul, dua pill button, install box `$ npm i -g sonic-point` + CopyButton) → `TerminalDemo` (output CLI asli; baris box harus 44 kolom, jaga saat edit) → grid 6 fitur (ikon garis `#ffd000`) → 3 langkah bernomor mono + comand chip → catatan batasan + link FAQ → CTA penutup.

## `/docs/[[...slug]]` — `src/app/docs/[[...slug]]/page.tsx` (SSG)

- Slug = nama file: `index.mdx` → `/docs`, `quickstart.mdx` → `/docs/quickstart`.
- `generateStaticParams` dari `docsFlat`; `dynamicParams = false` → 15 halaman ter-prerender, slug tak dikenal 404 **sebelum** page dieksekusi (fs hanya dibaca saat build; lihat quirk di [[03-config-decisions-todo]]).
- Layout dokumen: sidebar kiri sticky (`DocsSidebar`, item aktif amber) + konten `max-w-prose` (h1 dari frontmatter + deskripsi + `<MDXRemote>`), TOC kanan (`DocsToc`, hanya `xl`), `DocsPager` prev/next. Mobile: navigasi via `<details>` (tanpa JS).
- Engine di `lib/docs.ts`: `docsNav` (5 seksi, 15 item) satu sumber urutan; `readDoc()` → `gray-matter` + ekstraksi heading; `slugify()` dipakai dua sisi (heading & TOC) — jangan diubah sepihak. Heading MDX wajib teks polos.

## `/report/[sessionId]` — `src/app/report/[sessionId]/page.tsx` (`ƒ`)

UUID `sessions.id`; `notFound()` kalau null. Susunan: baris pill id + CopyButton + pill status sesi (`completed` hijau / `running` amber / `failed` merah) → H1 + baris meta (tanggal `id-ID` WIB, durasi dari `started_at→finished_at`, jumlah endpoint) → 4 stat card (`total_tested/success/failed/skipped`, angka `tabular-nums`) → `<EndpointList/>` (toolbar filter + baris accordion).

## `not-found.tsx`

404 global (juga dipakai report/docs): kode mono `404`, judul, dua pill (Beranda / Dokumentasi).
