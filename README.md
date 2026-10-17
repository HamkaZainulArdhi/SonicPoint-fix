# SonicPoint

Monorepo unified: CLI + dashboard web + Supabase backend.

```
SonicPoint/
  apps/web/          # Next.js dashboard (public report viewer)
  packages/cli/      # sonic-point CLI (scan Express, test endpoints, publish report)
  supabase/
    migrations/      # source of truth schema (001_initial_schema.sql)
    seed.sql         # dev data (fixed UUIDs)
```

Dipindah dari `D:\SKRIPSI\sonic-dashboard` + `D:\SKRIPSI\sonic-point` ke struktur ini.

## Alur Data

```
packages/cli (sonic-point)
  → scan + test endpoint
  → publish ke Supabase (projects, sessions, endpoints)
  → kembalikan shareable URL (/report/:sessionId)

apps/web (Next.js)
  → baca dari Supabase (public read, tanpa auth)
  → tampilkan di /report/[sessionId]
```

## Commands (dari root, pakai pnpm)

```bash
pnpm install          # install semua workspace
pnpm dev              # Next.js dev server (http://localhost:3000)
pnpm dev:cli          # jalankan CLI dari source (tsx)
pnpm build            # build CLI (tsc) + web (next build)
pnpm typecheck        # tsc --noEmit semua workspace
pnpm test             # node:test suites CLI via tsx
```

## Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com) (atau pakai CLI local).
2. Jalankan migrations di `supabase/migrations/` secara berurutan.
3. Copy URL + anon key ke `apps/web/.env.local` (lihat `apps/web/.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. Publish dari CLI tidak butuh key: session dikirim ke platform BE (`sonic-point.vercel.app`, bisa di-override `SONIC_POINT_PLATFORM_URL`), yang menulis dengan service_role-nya sendiri. Env platform (Vercel Production, server-only): `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` + `GEMINI_MODEL`(+`GEMINI_MODEL_CANDIDATES`), `SONIC_POINT_REPORT_BASE_URL`.

```bash
sonic-point init     # tanya base URL Express milikmu (target yang diuji)
# Advanced/lokal: sonic-point init juga menerima key Gemini/Supabase sendiri + SONIC_POINT_REPORT_BASE_URL
```

5. FK body seperti `lahanId` tidak dikarang AI: id nyata di-sampling dari GET collection API-mu lalu di-cache di `.sonic-point.json` (`refs`). Kalau collection kosong, endpoint dibiarkan gagal (404) apa adanya — bukan laporan palsu.

## Penyesuaian dependensi saat penyatuan

- Satu `pnpm-workspace.yaml` di root (`apps/*`, `packages/*`); workspace lama yang nyasar (`packages/cli/pnpm-workspace.yaml`) + `package-lock.json` CLI dihapus — semua install via `pnpm install` dari root.
- `@supabase/supabase-js` disamakan ke `^2.105.4` di `apps/web` + `packages/cli` (sebelumnya web `^2.45.0`) agar kontrak DB satu versi.
- `@types/node` disamakan ke `^25.7.0` di kedua workspace agar dedup pnpm maksimal.
- `typescript` sengaja beda major: web `^5.5.4` (Next 15 belum support TS 6), CLI `^6.0.3`. Jangan disamakan.
- Script CLI `prebuild` diganti `npm run clean` → `pnpm run clean`; ditambah `typecheck`/`lint` (`tsc --noEmit`) agar `pnpm --recursive typecheck/lint` dari root jalan di semua workspace.
