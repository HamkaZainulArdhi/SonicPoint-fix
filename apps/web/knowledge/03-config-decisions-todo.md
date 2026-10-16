---
title: Web Config Decisions TODO
tags:
  - sonicpoint
  - web
  - adr
  - todo
status: todo
source:
  - .env.example
  - next.config.mjs
  - src/app/globals.css
---

# Web Config, Decisions & TODO

## Env — hanya 2 var (`apps/web/.env.example` → `.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Tanpa server secret/service_role. Tidak ada test runner web (`next lint` deprecated; verifikasi = `build + typecheck`).

## Decisions (Web-specific; global di Vault Root)

- **W-ADR-01**: Tanpa Route Handler/API (`src/app/**/route.ts` tidak ada). Reason: tidak butuh backend custom.
- **W-ADR-02**: Components presentational saja, tanpa state management. Reason: Server Components cukup untuk viewer.
- **W-ADR-03**: Tailwind v4 (`@import "tailwindcss"`, plugin via `@tailwindcss/postcss`). Tanpa `tailwind.config.js`.

## TODO

| ID | Apa |
|---|---|
| W-01 | Fix B-01: link `← Sessions` kirim UUID, expect slug |
| W-02 | Verifikasi mirror `types/index.ts` vs SQL jika schema berubah |
| W-03 | `schemas` table belum dibaca Web — putuskan bareng CLI (U-01 Root) |

![[web-index.base]]
