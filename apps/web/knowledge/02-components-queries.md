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

- **SiteHeader / SiteFooter** — server; brand bolt amber + wordmark mono; nav link `silver-mist → snow`; satu pill primary "Quickstart".
- **ui.ts** — bukan komponen: kelas bersama. `pill("primary"|"ghost","md"|"sm")` (primary = fill amber + teks **obsidian**), `card`, `well`.
- **BoltMark** — svg bolt `currentColor`.
- **CopyButton** — client, `navigator.clipboard`, label berubah "Tersalin" 1,6 dtk; gagal senyap (http/izin).
- **CodeBlock** — client; well `bg-ink` + tombol salin mengambang; dipakai MDX (`pre`) dan report (`code=` string). `className` default `mt-6`, bisa di-override (`mt-2`).

### Docs

- **mdx.tsx** — map elemen MDX → gaya DESIGN (h2/h3 dengan `id={slugify(textOf(children))}`, p/ul/a/table/code/pre/dll). Heading pakai `scroll-mt-24`.
- **Callout** — `kind="note"|"warn"` (+title); `warn` = border amber + judul electric-gold.
- **DocsChrome** — `DocsSidebar` (aktif amber), `DocsToc`, `DocsPager`.

### Report

- **MethodChip** — pill mono 12px, lebar 64px; border+wash 10% warna method (Swagger dark: GET biru, POST hijau, PUT oranye, PATCH teal, DELETE merah).
- **StatusBadge** — `✓ <code>` ok / `✗ <code>` err / `SKIPPED` netral (`isSkippedStatus`: CLI menulis string `"SKIPPED"`, bukan angka) / `—` kalau null.
- **EndpointList** — client; state lokal `useState` (method + query), method chips `SEMUA + unik`, input cari path, counter `n / total`; tiap endpoint `<details>` (tanpa state library): summary = chip + `resolved_path` + badge `AI` + latensi + status + chevron `group-open:rotate-90`; isi = grid metadata (path template/resolved/auth/urutan/diuji) + `Request body`/`Response preview` (CodeBlock) + error/skip (`Alasan skip`).

## Helper presentasi (`lib/format.ts`)

`prettyJson`, `prettyMaybeJson` (only if starts `{`/`[`), `isSkippedStatus`, `formatLatency` (skip → `—`), `formatDateTime` (id-ID, `Asia/Jakarta`), `formatDuration` (ms → `dtk`/`mnt`).

## Types (`types/index.ts`)

`Project, Session(+SessionStatus running|completed|failed), Endpoint, SchemaRecord` — mirror SQL, sengaja duplikat dengan CLI (ADR-03 Root).

## AI guide

- Kolom baru → ubah `select` di sini + `types/index.ts` + kontrak Root + CLI `store.ts` bersamaan.
- `status_code` = `number | string | null` (DB `text`, CLI tulis `String(status)` / `'SKIPPED'`).
- Interaksi UI report: `<details>` + `useState` lokal saja — tanpa state library (W-ADR-02 amandemen).
