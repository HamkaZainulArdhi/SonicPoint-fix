---
title: CLI Config and Auth
tags:
  - sonicpoint
  - cli
  - config
status: active
source:
  - src/config/app.ts
  - src/config/providers.ts
  - src/cli/prompt.ts
  - src/domain/ref.ts
  - src/run/refs.ts
---

# Config & Auth

## `config/app.ts` — `.sonic-point.json` di rootDir

`{baseUrl, loginEndpoint, email, password, tokenField, token?, refs?}`. `resolveProject()`: `SONIC_POINT_PROJECT_ID → package.json.name → folder name`, via `slugify(lower, [^a-z0-9]→-, trim -)`.

### `refs` — cache id FK (ADR-08 Root)

Tulis-lewat dari `runSession`: nilai FK yang di-sampling dari API user disimpan **sekali** supaya run berikutnya tidak perlu GET lagi. Rata per noun (satu slot per entitas), tiap entri mencatat `host` (baseUrl ternormalisasi).

```json
"refs": {
  "lahan": {
    "id": "6775320b-…",
    "source": "GET /api/lahan",
    "host": "http://localhost:3000",
    "capturedAt": "2026-10-17T02:14:03.000Z"
  }
}
```

- `host` beda dari `baseUrl` aktif → dianggap miss → resample sekali, timpa entri itu (satu slot per noun, bukan per env).
- `stale: true` = request terakhir yang memakai id ini balas not-found → resample di run berikutnya; flag hilang setelah berhasil.
- Boleh diisi tangan sebagai fixture manual; nilai manual menang dan tidak pernah ditimpa selama `host` cocok dan tidak `stale`.
- `saveRefs()` selalu read-modify-write: `email/password/token` tidak pernah tertimpa. File tidak pernah dibuat kalau belum ada (kredensial dulu, baru refs).
- Aturan produk: cache kosong → payload dibiarkan apa adanya → 404 jujur. **Tidak pernah** memanggil POST producer untuk "membuat" data. Detail pipeline: [[02-run]].
- Isolasi test: `SONIC_POINT_HOME`/rootDir tmp (suite menulis `.sonic-point.json` di `os.tmpdir()`).

## `config/providers.ts` — prioritas

`env SONIC_POINT_* > file ~/.sonic-point/providers.json (SONIC_POINT_HOME override) > legacy env > missing` → `Resolved<T>{value, source, warnings}`.

- Gemini: `SONIC_POINT_GEMINI_API_KEY | file.geminiApiKey | GEMINI_API_KEY (legacy+warn)`. Null = warning box, fallback deterministik (bukan error).
- Supabase: `SONIC_POINT_SUPABASE_URL+_KEY | file | NEXT_PUBLIC_SUPABASE_URL+NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY (legacy+warn)`. Plus scan `.env` untuk warning migrasi.
- CLI prompt (`commands.ts:76`): `askSecret("Supabase key, service_role for publishing...")`.

## AI guide

- Warnings = data, hanya CLI yang print. Jangan baca env/disk di `ai/` atau `domain/`.
- Test: isolate provider writes dengan `SONIC_POINT_HOME` → tmp. Lihat `packages/cli/AGENTS.md`.
- U-02: `dotenv` terdaftar tapi tak di-import di `src/` — verifikasi sebelum andalkan `.env` auto-load.
- `.sonic-point.json` sekarang menyimpan juga `refs` (cache id FK) — kalau mengubah bentuk kredensial, jangan menimpa `refs` (pakai `saveRefs`, bukan tulis mentah).
