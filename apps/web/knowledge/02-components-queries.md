---
title: Components and Queries
tags:
  - sonicpoint
  - web
  - components
  - data
status: active
source:
  - src/components/mdx.tsx
  - src/components/EndpointList.tsx
  - src/components/StatusBadge.tsx
  - src/components/MethodChip.tsx
  - src/lib/supabase.ts
  - src/lib/queries.ts
  - src/lib/format.ts
  - src/types/index.ts
---

# Components & Queries

## Supabase client (`lib/supabase.ts`) — lazy

`getSupabase()` + `cached` singleton. `createClient(url, anonKey, {auth:{persistSession:false, autoRefreshToken:false}})` saat pertama dipanggil. Error jelas (`Copy .env.example ke .env.local`) baru saat request — agar `next build` lolos tanpa env. Anon read-only.

>Catatan Next: `process.env.NEXT_PUBLIC_*` di-**inline saat build**. Untuk menguji viewer dengan backend tiruan, env harus disuntik waktu `next build`, bukan waktu `next start`.

## Queries (`lib/queries.ts`) — hanya untuk report

| Fungsi | Query | Order |
|---|---|---|
| `getSessionById` | `sessions(...totals)` eq `id`, `.single()` | null on error |
| `getEndpointsBySession` | `endpoints(...)` eq `session_id` | `execution_order asc`, throw |

Query listing project/session sudah **dihapus** (bareng route `/projects`). Tanpa cache/revalidate, tanpa client fetch, tanpa write. Kolom lengkap lihat kontrak Root.

## Components

### Shell & util

- **ui.tsx** — primitif visual: `btn("primary"|"ghost")`, `LogoMark` (diamond amber + glow), `Badge(tone)`, `Kbd`, `IconOrb`, `WindowFrame`, `GhostChip`, `MetricCard`, `Rails` (rail fixed 1248px + crosshair), `Section` (shell section landing: `id/sec/eyebrow/title/description/aside/bg/glow`; root `scroll-mt-[72px]` = offset nav mengapung).
- **SiteHeader / MiniHeader / SiteFooter** — `SiteHeader` client (landing: anchor section + scroll-spy `IntersectionObserver` rootMargin `-96px 0px -55% 0px` → `aria-current="location"`; tombol kanan "Dokumentasi" → `/docs`; `return null` untuk `/docs`/`/report`; di 404 tampil link Quickstart/FAQ/GitHub). `MiniHeader` server statis (logo → `/`, GitHub, "Beranda") dipakai docs & report. `SiteFooter` server. Semuanya token baru.
- **InstallButton** — client; salin perintah install via `use-copy`, label "Tersalin"; hanya dipakai di `BottomCta` (bukan navbar lagi).
- **icons.tsx** — ikon garis stroke `currentColor` + peta `featureIcons` untuk kartu fitur.
- **Segs.tsx** — render model `Seg`/`Line` dari `lib/landing.ts` (tone → kelas teks, `code` → mono mist). Satu-satunya jalur teks bernada di landing — bukan string HTML.
- **CopyButton / use-copy (`lib/use-copy.ts`)** — client, `navigator.clipboard`, label berubah "Tersalin" ~1,6 dtk; gagal senyap (http/izin).
- **CodeBlock** — client; well `bg-ink` + tombol salin mengambang; dipakai MDX (`pre`) dan report (`code=` string). `className` default `mt-6`, bisa di-override (`mt-2`).

### Docs

- **mdx.tsx** — map elemen MDX → gaya DESIGN (h2/h3 dengan `id={slugify(textOf(children))}`, p/ul/a/table/code/pre/dll). Heading tanpa `scroll-mt` (offset anchor dari `scroll-padding-top: 24px` global).
- **Callout** — `kind="note"|"warn"` (+title); `warn` = border `amber-depth` + judul `electric-gold`.
- **DocsChrome** — `DocsSidebar` (item aktif `lightning-yellow`), `DocsToc` (hover garis amber), `DocsPager` (kartu `edge`-style).

### Report

- **MethodChip** — chip mono `text-micro` uppercase, lebar 64px; border+wash 10% warna method (Swagger dark: GET `#56c2ff`, POST ok, PUT warn, PATCH teal, DELETE err; lain → netral). Dipakai report + `ReportPreview` landing.
- **StatusBadge** — `✓ <code>` ok / `✗ <code>` err / `skipped` warn (`isSkippedStatus`: CLI menulis string `"SKIPPED"`, bukan angka) / `—` netral kalau null.
- **EndpointList** — client; state lokal `useState` (method + query), method chips `SEMUA + unik`, input cari path, counter `n / total`; tiap endpoint `<details>` (tanpa state library): summary = chip + `resolved_path` + badge `AI` + latensi + status + chevron `group-open:rotate-90`; isi = grid metadata (path template/resolved/auth/urutan/diuji) + `Request body`/`Response preview` (CodeBlock) + error/skip (`Alasan skip`, kotak `err`).

## Helper presentasi (`lib/format.ts`)

`prettyJson`, `prettyMaybeJson` (only if starts `{`/`[`), `isSkippedStatus`, `formatLatency` (skip → `—`), `formatDateTime` (id-ID, `Asia/Jakarta`), `formatDuration` (ms → `dtk`/`mnt`).

## Types (`types/index.ts`)

`Project, Session(+SessionStatus running|completed|failed), Endpoint, SchemaRecord` — mirror SQL, sengaja duplikat dengan CLI (ADR-03 Root).

## AI guide

- Kolom baru → ubah `select` di sini + `types/index.ts` + kontrak Root + CLI `store.ts` bersamaan.
- `status_code` = `number | string | null` (DB `text`, CLI tulis `String(status)` / `'SKIPPED'`).
- Interaksi UI report & landing: `<details>` + `useState` lokal saja — tanpa state library (W-ADR-02 amandemen). Warna fungsional tetap sah selama ia membawa data — termasuk mock report landing yang dilabeli `DEMO`.
