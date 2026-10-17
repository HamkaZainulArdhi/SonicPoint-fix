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

Shell global: `Rails` (garis rail 1248px + crosshair, fixed, `z-0`) → `SiteHeader` (nav kaca mengapung `glass-nav`, `fixed`, client — hanya landing: anchor section + scroll-spy `IntersectionObserver`; `return null` di `/docs` & `/report`) → `<main className="relative z-10 flex-1">` → `SiteFooter`; `body` flex kolom `min-h-screen`. Docs & report merender `MiniHeader` sendiri (statis: logo → `/`, GitHub, tombol "Beranda") di atas kontennya. Font: Inter + JetBrains Mono (`next/font/google`, variabel dipasang di `<html>`). Metadata: title template `%s · SonicPoint`, `metadataBase` dari `SONIC_POINT_REPORT_BASE_URL` (fallback `https://sonicpoint.vercel.app`). `lang="id"`. `app/icon.png` = logo SonicPoint (PNG, favicon resmi **dan** `<img>` logo di `SiteHeader`/`MiniHeader`; `LogoMark` diamond tetap dipakai di footer + chrome report).

## `/` — `src/app/page.tsx` (statis)

Landing tanpa data, urutan section (masing-masing punya file di `components/landing/` dan merakit `Section` sendiri): `Hero` (eyebrow, H1, subjudul, CTA, `PkgSwitcher` + install box + GitHub) → `TerminalWorkbench` (simulator REPL client: 5 tab endpoint + shortcut `1–5`) → `AstLab` (3 panel output validator zod/joi/yup) → `FeatureGrid` (6 kartu `key-card*`) → `ReportPreview` (mock report `demoReport.url`) → `ComparisonTable` (SonicPoint vs Postman vs Swagger) → `SlashCommands` (grid 8 perintah + toggle `:`) → `Faq` (+ kartu batasan dari `lib/landing.ts`) → `BottomCta`. Semua teks/data terpusat di `src/lib/landing.ts` (model `Seg`/`Line` → `Segs.tsx`); jangan tulis string di JSX.

## `/docs/[[...slug]]` — `src/app/docs/[[...slug]]/page.tsx` (SSG)

- Slug = nama file: `index.mdx` → `/docs`, `quickstart.mdx` → `/docs/quickstart`.
- `generateStaticParams` dari `docsFlat`; `dynamicParams = false` → 15 halaman ter-prerender, slug tak dikenal 404 **sebelum** page dieksekusi (fs hanya dibaca saat build; lihat quirk di [[03-config-decisions-todo]]).
- Layout dokumen: `MiniHeader` statis di atas (bukan nav kaca) + sidebar kiri sticky (`DocsSidebar`, item aktif amber, `top-6`) + konten `max-w-prose` (h1 dari frontmatter + deskripsi + `<MDXRemote>`), TOC kanan (`DocsToc`, hanya `xl`), `DocsPager` prev/next. Mobile: navigasi via `<details>` (tanpa JS). Offset anchor: `scroll-padding-top: 24px` global — section landing menambah `scroll-mt-[72px]` sendiri; heading docs tanpa `scroll-mt`.
- Engine di `lib/docs.ts`: `docsNav` (5 seksi, 15 item) satu sumber urutan; `readDoc()` → `gray-matter` + ekstraksi heading; `slugify()` dipakai dua sisi (heading & TOC) — jangan diubah sepihak. Heading MDX wajib teks polos.

## `/report/[sessionId]` — `src/app/report/[sessionId]/page.tsx` (`ƒ`)

UUID `sessions.id`; `notFound()` kalau null. Halaman diawali `MiniHeader` (sama seperti docs — tanpa nav kaca). Susunan: chrome `window-frame` (baris atas: `LogoMark` + label mono + badge `#id-pendek` (8 char) + `CopyButton` "Salin id" + pill status sesi (`completed` ok / `running` warn / `failed` err) + tanggal `id-ID` WIB & durasi dari `started_at→finished_at`) → H1 + jumlah endpoint → 4 stat card (`total_tested/success/failed/skipped`, angka `tabular-nums`, warn/err hanya kalau ada) → `<EndpointList/>` (toolbar filter + baris accordion).

## `not-found.tsx`

404 global (juga dipakai report/docs): eyebrow "Error 404", judul, dua tombol (`btn-primary` / `btn-ghost`).
