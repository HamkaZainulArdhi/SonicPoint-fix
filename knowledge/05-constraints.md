---
title: Constraints and Unknowns
tags:
  - sonicpoint
  - constraints
status: active
source:
  - packages/cli/src/scan/schemas.ts
  - packages/cli/src/run/params.ts
  - apps/web/src/app/report/[sessionId]/page.tsx
---

# Constraints & Unknowns

## Batasan terkonfirmasi

| # | Batasan | Dampak |
|---|---|---|
| C-01 | CLI scan hanya Express (`app/router.use + route()`), import relatif `./` saja | Fastify/Koa/Nest tidak terdeteksi |
| C-02 | Schema extraction hanya `root/src/{validation,validators,schemas,schema,validations}/*`, framework Joi/Zod/Yup | Validasi inline tidak terbaca |
| C-03 | `DELETE` bukan write-method (hanya POST/PUT/PATCH dapat payload) | Body DELETE diabaikan |
| C-04 | `request()` selalu kirim `Authorization: Bearer` walau token kosong | Endpoint publik tetap dapat header kosong |
| C-05 | GET tidak pernah prompt param — langsung skip jika `:param` tak ter-resolve | Coverage GET berparam rendah |
| C-06 | Web 2 env saja, tanpa server secret | Tidak ada auth/preview privat |
| C-07 | Env web `NEXT_PUBLIC_*` = publik di bundle | Jangan taruh service_role di Web |
| C-08 | `inferModel`: panggilan `x.y` dengan `y` lowercase dan root bukan `*Service/*Controller/*Model`/Kapital → dianggap **model**, bukan service (mis. `cycleB.step` → model `Step`). Service harus bernama `*Service` (dkk, lihat `knowledge.ts:338`) agar ter-trace rekursif | Beri nama service `*Service`; jangan harapkan trace untuk helper generik |

## Bug terkonfirmasi

- **B-01 slug vs UUID**: `report/[sessionId]/page.tsx:23` link `/projects/${session.project_id}` (UUID), tapi `projects/[projectId]` expect `slug` → `notFound()`. Fix di Vault Web.

## NEEDS VERIFICATION (jangan diasumsikan)

- **U-01 tabel `schemas`**: ada di SQL, tanpa write di `store.ts` / read di `queries.ts`. Apakah pipeline publish schema belum diimplementasikan?
- **U-02 `dotenv`**: terdaftar di CLI deps, tidak di-import di `src/`. Apakah `.env` sebenarnya tidak ter-load?
- **U-03 `sessions.status='failed'`**: CHECK mengizinkan, tapi `closeSession` selalu `completed`. Kapan `failed` dipakai?
- **U-04 seed vs prod**: seed fixed-UUID hanya dev. URL prod = UUID acak.

> [!tip] Untuk AI
> Tandai temuan baru sebagai `U-XX` di sini, jangan mengarang. Perbaiki C/B di vault spesifik (CLI/Web), update file ini sebagai index.
