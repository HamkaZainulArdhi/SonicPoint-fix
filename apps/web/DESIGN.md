# SonicPoint — Style Reference

> Midnight code editor with an amber caret — a single chromatic pulse on a sea of charcoal.

**Theme:** dark (dark-only — no light mode, no theme toggle)

Adaptasi dari template referensi Supabase (monokrom + satu aksen). Perubahan
dari template: aksen **phosphor green → amber** (tema "Amber/Sonic", senada
dengan TUI CLI), nilai token yang salah ketik diperbaiki, dan ditambah satu
keluarga warna **fungsional** yang hanya dipakai untuk data (status tes &
chip method di report viewer) — lihat bagian *Functional Colors*.

Source measurements are normalized; roles and recommendations are interpreted.
Font summary lists are independent, not paired by position.

SonicPoint adalah IDE tengah malam dengan tanda baca amber: kanvas nyaris
hitam, permukaan UI monokrom, dan satu amber vivid yang menandai penekanan,
judul, dan aksi utama. Irama antarmuka dipinjam dari editor kode — border
setipis rambut, kontrol pill, ruang vertikal yang lapang, dan tipografi
geometris rapat (Inter) yang berbisik di weight 400, bukan berteriak tebal.
Warna dijatah: halaman 99% grayscale, dan setiap piksel amber diperoleh dengan
menjadi CTA, keyword yang di-highlight, atau logo. Kartu mengapung satu level
di atas kanvas lewat kontras border, bukan shadow. Nuansa keseluruhannya cepat,
terminal-native, dan percaya diri tanpa berisik — dirancang menghilang supaya
produk dan audiens developer-nya jadi bintang.

## Tokens — Colors

### Accent — Amber

| Name | Value | Token | Role |
|------|-------|-------|------|
| Lightning Yellow | `#ffe600` | `--color-lightning-yellow` | **Aksen utama**: fill CTA primer, keyword yang di-highlight, item nav aktif, logo mark. Satu elemen per region |
| Electric Gold | `#ffd000` | `--color-electric-gold` | Link teks dan aksen inline — varian amber yang sedikit lebih kalem untuk rujukan tekstual |
| Amber Depth | `#a67c00` | `--color-amber-depth` | Border hover/pressed pada CTA amber — tombol tetap dikenali saat fill berubah |
| Dark Amber | `#6b4e00` | `--color-dark-amber` | Permukaan brand tergelap — wash section tipis dan state nonaktif |

### Neutral — Light to Dark

| Name | Value | Token | Role |
|------|-------|-------|------|
| Snow | `#fafafa` | `--color-snow` | Teks utama, stroke ikon, label tombol — foreground dominan |
| Silver Mist | `#b4b4b4` | `--color-silver-mist` | Subjudul, body sekunder, item nav — terbaca tapi tidak bersaing |
| Smoke | `#898989` | `--color-smoke` | Teks tersier, caption, helper, metadata |
| Graphite | `#4d4d4d` | `--color-graphite` | Outline ikon, border low-emphasis, divider, garis ilustrasi |
| Slate | `#393939` | `--color-slate` | Border input, pemisah halus antar nav dan konten |
| Charcoal | `#2e2e2e` | `--color-charcoal` | Border kartu & komponen — border paling sering dipakai; permukaan didefinisikan border, bukan shadow |
| Ash | `#242424` | `--color-ash` | Tier permukaan terangkat: kartu bersarang, hover state, latar popover |
| Obsidian | `#121212` | `--color-obsidian` | Kanvas halaman — fondasi gelap di balik semua section dan kartu |
| Ink | `#0d0d0d` | `--color-ink` | Well terdalam: blok kode, terminal, ilustrasi — satu tier di bawah kanvas |

### Functional Colors — hanya untuk data

Warna di bawah **bukan dekorasi**. Hanya boleh muncul saat membawa informasi
(status hasil tes, method HTTP). Ini satu-satunya penyimpangan sadar dari
aturan "monokrom + satu aksen", disetujui untuk report viewer bergaya Swagger.

| Name | Value | Token | Role |
|------|-------|-------|------|
| OK | `#3fb950` | `--color-ok` | Status lolos (`✓ 201`), aksen positif pada output |
| Err | `#f85149` | `--color-err` | Status gagal (`✗ 500`), pesan error |
| Method GET | `#6cb6ff` | `--color-method-get` | Chip method GET — konvensi Swagger (biru) |
| Method POST | `#3fb950` | `--color-method-post` | Chip method POST — konvensi Swagger (hijau) |
| Method PUT | `#e3903f` | `--color-method-put` | Chip method PUT — konvensi Swagger (oranye) |
| Method PATCH | `#39c9bd` | `--color-method-patch` | Chip method PATCH — konvensi Swagger (teal) |
| Method DELETE | `#f85149` | `--color-method-delete` | Chip method DELETE — konvensi Swagger (merah) |

Chip method memakai varian dark: **border + teks berwarna** dengan wash 10%,
bukan fill besar. Status badge memakai pola yang sama.

## Tokens — Typography

### Inter — All UI typography — nav, body, buttons, headings, display. · `--font-inter` → `--font-sans`

- **Substitute (dipakai):** Inter via `next/font/google` — geometris-humanis, sehangat Circular tanpa biaya lisensi
- **Weights:** 400, 500 (maksimum — jangan pernah 600/700)
- **Sizes:** 12px, 14px, 16px, 18px, 24px, 36px, 72px
- **Line height:** 1.00–1.5 (rapat: 1.0 di display 72px, 1.5 di body)
- **Letter spacing:** ≈ -0.007em di semua ukuran (≈ -0.5px di display, nyaris 0 di body) — tracking negatif seragam ini tanda tangan sistem; mengencangkan bentuk geometris jadi satu suara utuh
- **Role:** Seluruh tipografi UI. Weight 400 membawa headline (pilihan anti-tebal yang sengaja); weight 500 hanya untuk penekanan dan label tombol

### JetBrains Mono — Inline code dan output terminal · `--font-jetbrains-mono` → `--font-mono`

- **Substitute (dipakai):** JetBrains Mono via `next/font/google`
- **Weights:** 400, 500
- **Sizes:** 12px (caption), **13px** (blok kode — token tambahan `--text-code`, di luar 7 ukuran utama karena blok kode adalah permukaan baca utama situs ini)
- **Line height:** 1.6 di blok kode (kenyamanan baca snippet panjang)
- **Letter spacing:** normal di blok kode (alignment kolom lebih penting daripada estetika); tracking negatif kecil mengikuti skala teks saat dipakai inline
- **Role:** Inline code, blok kode, output terminal, angka metrik. Bukan untuk body copy

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token (Tailwind: `text-*`) |
|------|------|-------------|----------------|----------------------------|
| caption | 12px | 1.5 | -0.084px | `--text-caption` |
| body-sm | 14px | 1.43 | -0.098px | `--text-body-sm` |
| body | 16px | 1.5 | -0.112px | `--text-body` |
| subheading | 18px | 1.38 | -0.126px | `--text-subheading` |
| heading-sm | 24px | 1.33 | -0.168px | `--text-heading-sm` |
| heading | 36px | 1.2 | -0.252px | `--text-heading` |
| display | 72px | 1 | -0.504px | `--text-display` |
| code (tambahan) | 13px | 1.6 | 0 | `--text-code` |

Di Tailwind v4, `line-height` & `letter-spacing` menempel langsung di utility
`text-*` (lewat `--text-*--line-height` / `--text-*--letter-spacing`), jadi
cukup `text-body` untuk mendapat ketiganya.

## Tokens — Spacing & Shapes

**Base unit:** 8px (kelipatan 4px diizinkan lewat skala dinamis Tailwind v4)

**Density:** comfortable

### Layout

- **Page max-width:** 1200px — token `--container-page`, utility `max-w-page`
- **Section gap:** 64–96px (`py-16` … `py-24`)
- **Card padding:** 24px (`p-6`)
- **Element gap:** 8–16px (`gap-2` … `gap-4`)

### Border Radius

| Element | Value | Utility |
|---------|-------|---------|
| tags / chip / tombol | 9999px | `rounded-full` |
| cards | 16px | `rounded-2xl` |
| inputs / kode | 8px | `rounded-lg` |

Tidak ada radius lain. Jangan pakai `rounded-md`/`rounded-xl`/`rounded-3xl`
atau nilai arbitrary — kosakata radius yang terbatas itu disengaja.

### Shadows

Tidak ada. Sistem ini **flat secara sengaja**; kedalaman diciptakan border
1px dan perbedaan tier permukaan. (Template asal mendeteksi satu sisa
`--shadow-sm`; kami membuangnya sepenuhnya.)

## Components

### Pill Primary Button
**Role:** Call-to-action utama — fill amber, teks obsidian, fully rounded.

Background `#ffe600`, teks `#121212` (**teks putih di atas amber tidak
terbaca** — ini adaptasi penting dari template), border 1px `#ffe600`. Padding
8px 16px. Radius 9999px. Inter 500, 14px. Hover: fill `#ffd000` + border
`#a67c00`. Amber adalah satu-satunya permukaan kromatik yang di-fill — setiap
tombol amber harus terasa seperti keputusan yang disengaja.

### Pill Ghost Button
**Role:** Aksi sekunder — fill transparan, border halus, monokrom.

Background transparan, border 1px `#393939`, teks `#fafafa`. Padding 8px 16px.
Radius 9999px. Inter 400, 14px. Hover: border `#4d4d4d`, background
`rgba(255,255,255,0.04)`.

### Top Navigation Bar
**Role:** Navigasi sticky site-wide (landing, docs, report).

Full-width, background `#121212` dengan opacity 95% + blur saat sticky. Tinggi
64px. Kiri: bolt mark amber (`#ffe600`) + wordmark mono `sonic-point` di
`#fafafa`. Nav link di `#b4b4b4` (Inter 400, 14px; hover `#fafafa`). Kanan:
satu pill primary "Quickstart". Border bawah 1px `#2e2e2e`.

### Feature Card
**Role:** Kartu kapabilitas produk dalam grid 2 atau 3 kolom.

Background `#121212` (sama dengan kanvas — didefinisikan hanya oleh border).
Border 1px `#2e2e2e`. Radius 16px. Padding 24px. Ikon garis 1.5px berukuran
24px dalam `#ffd000`, heading `#fafafa` (Inter 500, 18px), body `#b4b4b4`
(Inter 400, 14px). Area ilustrasi opsional: line-art `#4d4d4d` di atas
`#0d0d0d`.

### Code Well / Terminal
**Role:** Blok kode di docs dan demo terminal di landing.

Background `#0d0d0d` (`--color-ink`), border 1px `#2e2e2e`, radius 8px.
Konten JetBrains Mono 13px / 1.6 dalam `#b4b4b4`; baris perintah `$` amber;
`✔` hijau fungsi (`#3fb950`); link/URL keluaran `#ffd000`. Tombol salin:
chip pill kecil border `#393939`, caption `#898989`. Tanpa syntax
highlighting berwarna — hanya penanda peran (prompt, sukses, catatan).

### Method Chip (report)
**Role:** Menandai method HTTP — konvensi Swagger varian dark.

Pill `rounded-full`, border 1px + wash 10% dari warna method, teks mono 12px
dengan warna method yang sama. Lebar tetap 64px agar kolom rapi. GET biru,
POST hijau, PUT oranye, PATCH teal, DELETE merah.

### Status Badge (report)
**Role:** Status hasil satu endpoint.

Pola yang sama dengan method chip: `✓ 200` (border+teks `--color-ok`),
`✗ 500` (border+teks `--color-err`), `SKIPPED` (netral: border `#2e2e2e`,
teks `#898989`). Simbol + warna sekaligus — jangan andalkan warna saja.

### Report Row (accordion)
**Role:** Satu baris endpoint di report viewer.

`<details>` native (tanpa JS): baris ringkas berisi method chip, path mono,
badge AI opsional, latensi, status badge, dan chevron yang berputar saat
terbuka (`group-open:rotate-90`). Radius 16px, border `#2e2e2e` (menjadi
`#393939` saat terbuka). Isi terbuka: grid metadata + blok JSON request /
response di code well. Chevron dan baris memakai hover wash
`rgba(255,255,255,0.02)`.

### Input Field
**Role:** Input pencarian/filter di toolbar report.

Background `#121212`, border 1px `#393939`, radius 8px, padding 8px 12px.
Teks `#fafafa`, placeholder `#898989` (Inter 400, 14px). Focus: border
bergeser ke `#ffd000` — border kromatik ADALAH indikator fokus, tanpa glow
ring.

## Do's and Don'ts

### Do
- Pakai `#ffe600` (Lightning Yellow) hanya untuk: CTA primer, keyword headline yang ditekankan, logo mark, item nav/daftar yang aktif — jatahkan aksen ke satu elemen per region visual
- Set semua tombol/chip/tag ke radius 9999px dan semua kartu ke 16px — dualitas pill/card mendefinisikan sistem
- Pakai Inter weight 400 untuk headline dan 500 untuk penekanan + label tombol — tidak pernah bold; 500 adalah suara paling keras yang tersedia
- Pisahkan permukaan dengan border 1px `#2e2e2e` di kanvas `#121212` — permukaan gelap tambahan (`#242424`, `#0d0d0d`) hanya untuk komponen bersarang dan code well, sementara section halaman tetap rata
- Jaga letter-spacing ≈ -0.007em seragam di semua ukuran teks
- Pakai amber sebagai border fokus input (1px, tanpa glow ring)
- Pakai warna fungsional (ok/err/method) **hanya** saat membawa data — jangan pernah sebagai dekorasi

### Don't
- Jangan perkenalkan warna kromatik lain di luar keluarga amber dan warna fungsional — disiplin monokrom adalah brand
- Jangan pakai weight 600/700 di Inter — sistem berhenti di 500; butuh penekanan? perbesar ukuran atau pakai amber
- Jangan tambahkan box-shadow ke kartu, popover, atau modal — desainnya datar; pakai border `#2e2e2e`
- Jangan pakai radius selain 9999px (tombol/tag), 16px (kartu), atau 8px (input/kode)
- Jangan taruh amber di area background luas — dia muncul sebagai tanda baca fungsional kecil, bukan latar section
- Jangan pakai teks putih di atas amber sebagai fill — `#121212` hanya cocok untuk amber
- Jangan pakai gradien — sistem ini strictly flat dan terminal-native
- Jangan pakai emoji sebagai ikon UI (emoji hanya boleh saat meniru output CLI apa adanya)

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| -1 | Ink Well | `#0d0d0d` | Blok kode, terminal, area ilustrasi — lebih dalam dari kanvas |
| 0 | Obsidian Canvas | `#121212` | Latar halaman — layer dasar semua permukaan |
| 1 | Ash Card | `#242424` | Permukaan bersarang/terangkat satu tier: popover, pill, hover state |
| — | Charcoal Border | `#2e2e2e` | Outline kartu & komponen — mendefinisikan tepi tanpa shadow |

## Elevation

SonicPoint sengaja menghindari shadow. Antarmuka mengandalkan border
setipis rambut `#2e2e2e` untuk memisahkan permukaan dari kanvas `#121212`.
Pendekatan terminal-native ini menjaga UI tetap datar dan seperti editor kode.

## Imagery

Line-art dan ilustrasi wireframe mendominasi — bentuk geometris (kubus, grid,
node jaringan) digambar dengan stroke `#4d4d4d` di atas `#0d0d0d`, dengan
aksen titik amber sesekali. Ikon adalah outline tipis (1.5px), monokrom
`#fafafa`/`#b4b4b4`; amber hanya untuk konteks aktif/brand. Bahasa visualnya
diagramatis dan teknis — estetika skematik developer tool, bukan situs
marketing. (Di landing aktual, peran "ilustrasi" diambil oleh demo terminal
yang merender output CLI sungguhan — pilihan yang lebih jujur daripada
gambar.)

## Layout

Kanvas gelap full-width dengan konten berpusat pada max-width 1200px
(`max-w-page`). Hero: teks terpusat, headline display 72px (dua baris, baris
kedua amber), subtitle 16px, dua pill button berdampingan, lalu satu baris
perintah instalasi. Section fitur memakai grid kartu (3 kolom di desktop);
section langkah memakai tiga kolom bernomor mono. Ritme vertikal 64–96px
tanpa divider yang mencolok — hanya border 1px antar section besar untuk
memisahkan blok pada tema amber yang lebih terang. Footer adalah satu band
gelap dengan nav sekunder dan perintah instalasi mono. Navigasi adalah top
bar fixed 64px.

Halaman dokumen menambahkan dua rel: sidebar navigasi (kiri, sticky, aktif
amber) dan daftar isi per halaman (kanan, di layar xl), dengan konten dibatasi
`max-w-prose` ala dokumen teknis.

## Agent Prompt Guide

## Quick Color Reference
- text: `#fafafa`
- background: `#121212`
- card surface: `#121212` (dengan border `#2e2e2e`)
- code well: `#0d0d0d`
- border: `#2e2e2e` (kartu), `#393939` (input), `#4d4d4d` (ikon)
- accent: `#ffe600` (Lightning Yellow)
- accent hover: `#ffd000` (Electric Gold) + border `#a67c00`
- primary action text: `#121212`
- functional: ok `#3fb950`, err `#f85149` (status & method chip saja)

## Example Component Prompts

1. **Hero Section**: Terpusat di kanvas `#121212`. Headline display 72px Inter 400, `#fafafa`, letter-spacing -0.5px. Baris kedua `#ffe600`. Subtitle 16px Inter 400, `#b4b4b4`, line-height 1.5. Dua pill button: amber primer (`#ffe600` fill, `#121212` text, radius 9999px, padding 8px 16px) dan ghost sekunder (transparan, border 1px `#393939`, teks `#fafafa`).

2. **Feature Card Grid**: grid 3 kolom di `#121212`. Tiap kartu: radius 16px, border 1px `#2e2e2e`, padding 24px. Ikon garis 1.5px warna `#ffd000`, ukuran 24px. Heading `#fafafa` Inter 500 18px. Body `#b4b4b4` Inter 400 14px line-height 1.5.

3. **Top Navigation**: tinggi 64px, full-width, background `#121212`/95 + blur. Kiri: bolt mark amber + wordmark mono `#fafafa`. Nav link `#b4b4b4` Inter 400 14px. Kanan: pill primary amber. Border bawah 1px `#2e2e2e`.

4. **Code Well (terminal)**: background `#0d0d0d`, border 1px `#2e2e2e`, radius 8px, padding 20px. JetBrains Mono 13px line-height 1.6 warna `#b4b4b4`. Prompt `$` `#ffe600`; baris sukses `✔` `#3fb950`; URL output `#ffd000`; catatan `↳` `#898989`. Tombol salin pill kecil di kanan atas.

5. **Input Field**: background `#121212`, border 1px `#393939`, radius 8px, padding 8px 12px. Teks `#fafafa` Inter 400 14px, placeholder `#898989`. Focus: border `#ffd000` — tanpa glow ring atau shadow.

6. **Report Row**: `<details>` radius 16px, border `#2e2e2e` (→ `#393939` saat terbuka). Ringkasan: chip method (border+wash 10%, mono 12px, lebar 64px), path mono `#fafafa`, latensi mono `#898989`, status badge, chevron `#4d4d4d` yang berputar saat terbuka. Isi: grid metadata dan blok JSON di code well.

## Similar Brands

- **Vercel** — Kanvas gelap monokrom yang sama, strategi satu aksen, dan aksi primer pill — Vercel memakai putih/biru, SonicPoint memakai amber
- **Supabase** — Nenek moyang template ini: IDE tengah malam, border rambut, dan satu aksen vivid (mereka hijau, kami amber)
- **Railway** — Estetika developer-tool gelap dengan tipografi geometris rapat dan perlakuan permukaan minimal
- **Linear** — UI gelap dengan pemakaian warna yang dijatah, border rambut sebagai ganti shadow, dan elemen interaktif pill
- **Warp / terminal emulators** — Warisan visual hijau/amber di atas hitam; SonicPoint mengambil sisi amber-nya dan menjaga nuansa terminal-native

## Quick Start

**Sumber kebenaran token: `src/app/globals.css`.** Salinan di bawah ini untuk
referensi agen; kalau berbeda, menangkan file CSS.

### Tailwind v4 (aktual, disalin dari `src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Aksen amber */
  --color-lightning-yellow: #ffe600;
  --color-electric-gold: #ffd000;
  --color-amber-depth: #a67c00;
  --color-dark-amber: #6b4e00;

  /* Netral terang → gelap */
  --color-snow: #fafafa;
  --color-silver-mist: #b4b4b4;
  --color-smoke: #898989;
  --color-graphite: #4d4d4d;
  --color-slate: #393939;
  --color-charcoal: #2e2e2e;
  --color-ash: #242424;
  --color-obsidian: #121212;
  --color-ink: #0d0d0d;

  /* Fungsional — hanya untuk data */
  --color-ok: #3fb950;
  --color-err: #f85149;
  --color-method-get: #6cb6ff;
  --color-method-post: #3fb950;
  --color-method-put: #e3903f;
  --color-method-patch: #39c9bd;
  --color-method-delete: #f85149;
  --color-method-other: #b4b4b4;

  /* Skala teks (line-height & tracking menempel di utility) */
  --text-caption: 12px;
  --text-caption--line-height: 1.5;
  --text-caption--letter-spacing: -0.084px;

  --text-body-sm: 14px;
  --text-body-sm--line-height: 1.43;
  --text-body-sm--letter-spacing: -0.098px;

  --text-body: 16px;
  --text-body--line-height: 1.5;
  --text-body--letter-spacing: -0.112px;

  --text-subheading: 18px;
  --text-subheading--line-height: 1.38;
  --text-subheading--letter-spacing: -0.126px;

  --text-heading-sm: 24px;
  --text-heading-sm--line-height: 1.33;
  --text-heading-sm--letter-spacing: -0.168px;

  --text-heading: 36px;
  --text-heading--line-height: 1.2;
  --text-heading--letter-spacing: -0.252px;

  --text-display: 72px;
  --text-display--line-height: 1;
  --text-display--letter-spacing: -0.504px;

  /* Tambahan di luar 7 ukuran utama: blok kode & output terminal */
  --text-code: 13px;
  --text-code--line-height: 1.6;

  /* Layout */
  --container-page: 1200px;
}

@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
```

**Catatan implementasi:**

- Semua warna & ukuran **wajib** ada di blok `@theme` — kalau ditaruh di `:root` polos, utility Tailwind (`bg-obsidian`, `text-heading`, `max-w-page`) tidak akan ter-generate.
- Jangan override `--spacing-*`: skala dinamis default Tailwind v4 (kelipatan 4px dari `--spacing: 0.25rem`) sudah pas; angka spacing DESIGN.md (8/16/24/32/48/64/96) tersedia sebagai `p-2`…`p-24`.
- Radius memakai built-in: `rounded-full` (9999px), `rounded-2xl` (16px), `rounded-lg` (8px). Tidak ada token radius kustom.
- `@theme inline` khusus untuk font karena nilainya menunjuk variabel runtime `next/font` yang dipasang di `<html>`.
