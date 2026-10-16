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
---

# Config & Auth

## `config/app.ts` — `.sonic-point.json` di rootDir

`{baseUrl, loginEndpoint, email, password, tokenField, token?}`. `resolveProject()`: `SONIC_POINT_PROJECT_ID → package.json.name → folder name`, via `slugify(lower, [^a-z0-9]→-, trim -)`.

## `config/providers.ts` — prioritas

`env SONIC_POINT_* > file ~/.sonic-point/providers.json (SONIC_POINT_HOME override) > legacy env > missing` → `Resolved<T>{value, source, warnings}`.

- Gemini: `SONIC_POINT_GEMINI_API_KEY | file.geminiApiKey | GEMINI_API_KEY (legacy+warn)`. Null = warning box, fallback deterministik (bukan error).
- Supabase: `SONIC_POINT_SUPABASE_URL+_KEY | file | NEXT_PUBLIC_SUPABASE_URL+NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY (legacy+warn)`. Plus scan `.env` untuk warning migrasi.
- CLI prompt (`commands.ts:76`): `askSecret("Supabase key, service_role for publishing...")`.

## AI guide

- Warnings = data, hanya CLI yang print. Jangan baca env/disk di `ai/` atau `domain/`.
- Test: isolate provider writes dengan `SONIC_POINT_HOME` → tmp. Lihat `packages/cli/AGENTS.md`.
- U-02: `dotenv` terdaftar tapi tak di-import di `src/` — verifikasi sebelum andalkan `.env` auto-load.
