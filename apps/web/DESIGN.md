# DESIGN.md — SonicPoint Web

> Aturan desain `apps/web`. Satu sumber nilai: blok `@theme` di `src/app/globals.css` —
> ubah token **di sana**, bukan di komponen. Token di `:root` polos tidak menghasilkan
> utility Tailwind; semua warna/ukuran harus di `@theme` (atau `@theme inline` untuk font).

## Karakter

Raycast-style: dark-only, tenang, terasa seperti "alat" — bukan halaman marketing.
Aksen tunggal **amber**; netral membawa struktur; warna lain hanya kalau membawa data.

- Dark-only, tanpa toggle. Kanvas `void-black`; permukaan naik `ink → obsidian → graphite`.
- **Amber** untuk aksen teknis: logo diamond, prompt `$`, tab aktif, endpoint terpilih,
  badge, kartu kunci, atmosfer hero. Bukan untuk tombol aksi.
- **CTA tetap netral**: `.btn-primary` = fill `mist` + teks gelap; `.btn-ghost` = `obsidian`
  + border `slate`. Amber tidak pernah jadi warna tombol.
- **Warna fungsional** (`ok`, `warn`, `err`, `method-*`) hanya saat membawa status/hasil:
  chip method + badge status di report, lencana perbandingan. Merah hanya 4xx/5xx + DELETE;
  biru (`method-get`) satu-satunya biru non-amber di seluruh situs.
- Font Inter (body) + JetBrains Mono (angka, path, label kecil) via `next/font`. Tanpa font baru.
- Weight maksimum 500. Tanpa `font-bold`/`font-extrabold`.

## Token (ringkas — lengkap di `globals.css`)

**Netral (terang → gelap):** `pure-white #ffffff` (headline) · `mist #e6e6e6` (teks terang,
tombol netral) · `ash #9c9c9d` (teks sekunder) · `smoke #6a6b6c` (teks tersier) ·
`iron #454647` (border hover) · `hairline #363739` (border section) · `slate #2f3031`
(border komponen — sengaja menimpa nama skala Tailwind) · `graphite #1b1c1e` (badge/panel) ·
`obsidian #111214` (permukaan) · `ink #07080a` (well) · `void-black #040506` (kanvas).

**Amber:** `lightning-yellow #ffe600` · `electric-gold #ffd000` · `amber-depth #a67c00` ·
`dark-amber #6b4e00`.

**Fungsional:** `ok #59d499` · `warn #ffbe5c` · `err #ff6363` · `method-get #56c2ff` ·
`method-post/put/patch/delete/other`.

**Skala teks** (line-height & tracking menempel di token): `micro 10` · `tiny 11` ·
`mono 12` · `code 13` · `body-sm 14` · `body 16` · `subheading 18` · `title 20` ·
`heading-sm 24` · `heading 32` · `heading-lg 38` · `display 56`.

**Shadow** (keycap: inset + ring tegas, bukan glow lembut): `key` · `key-hover` · `btn` ·
`window` · `well` · `orb` · `kbd` · `edge`.

**Layout:** `max-w-page` 1200px · `max-w-rail` 1248px (garis rail + crosshair section).

**Radius yang dipakai:** `rounded-[4px]` (chip method) · `[5px]`/`[6px]` (badge, kbd, tombol
kecil) · `rounded-md` (filter) · `rounded-lg` (block kode, well) · `rounded-xl`/`2xl` (kartu)
· `rounded-full` (orb).

## Kelas komponen (`@layer components`)

`glass-nav` · `btn-primary` `btn-ghost` · `key-card` `key-card-amber` `key-card-gold`
`edge-card` · `icon-orb` · `kbd` · `badge` `badge-amber` `badge-gold` · `input-well`
`window-frame` · `eyebrow` · `bg-tech-grid` `bg-dot-matrix` `section-beam` `rail-crosshair`
`ghost-chip` · `hero-wash` `hero-bar-1` `hero-bar-2` · `animate-flow`.

Nilai arbitrary (gradien, blur, mask) **hanya** boleh hidup di `globals.css`; JSX memakai
kelas di atas.

## Peta permukaan

| Permukaan | File | Catatan |
|---|---|---|
| Landing | `src/app/page.tsx` + `src/components/landing/*` | teks & data di `src/lib/landing.ts` (model `Seg`/`Line`, helper lokal `s()`/`cd()`); segmen dirender `Segs.tsx`; tiap section merakit `Section` sendiri |
| Primitif bersama | `src/components/ui.tsx` | `btn`, `LogoMark`, `Badge`, `Kbd`, `IconOrb`, `WindowFrame`, `GhostChip`, `MetricCard`, `Rails`, `Section` |
| Nav | `SiteHeader`, `MiniHeader`, `InstallButton` | `SiteHeader` = nav kaca mengapung + scroll-spy section (`aria-current`, underline amber); `/docs` & `/report` pakai `MiniHeader` statis; CTA kanan → `/docs`; `InstallButton` (salin) hanya di CTA bawah |
| Docs | `DocsChrome`, `mdx.tsx`, `Callout`, `CodeBlock` | anchor h2/h3 wajib lewat `slugify()` yang sama dengan TOC |
| Report | `report/[sessionId]/page.tsx`, `EndpointList`, `MethodChip`, `StatusBadge` | satu-satunya tempat warna fungsional penuh |

## Larangan

- Jangan pakai amber/warna fungsional sebagai dekorasi di luar maknanya.
- Jangan tulis nilai warna/ukuran baru langsung di JSX — pakai token + kelas kustom.
- Jangan tambah dependency (termasuk font) demi tampilan.
- Jangan ubah `slugify()` sepihak (heading docs + TOC dua-duanya memakainya).
- Jangan tambah `force-dynamic` ke landing/docs; jangan import Supabase di sana.
