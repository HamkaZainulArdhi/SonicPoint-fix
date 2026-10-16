---
title: Run Pipeline
tags:
  - sonicpoint
  - cli
  - run
status: active
source:
  - src/run/runner.ts
  - src/run/http.ts
  - src/run/auth.ts
  - src/run/params.ts
  - src/run/payloads.ts
  - src/ai/client.ts
  - src/ai/prompt.ts
---

# Run Pipeline (`send`)

`runSession(targets, options)` return `TestSession`. Tanpa `console.*`.

## Loop (`runner.ts`)

`targets kosong → RunError` → `login()` → cache token ke `.sonic-point.json` jika awalnya kosong → `checkServer()` → `loadSchemas` via `buildApiGraph` (hanya jika ada write-method) → per target: `resolvePath → resolvePayload (write only) → request → push executed + store.save(session)`.

## Modul

- **http.ts**: `request(method,url,token,fetch,body?)` selalu `Authorization: Bearer`, `Content-Type` jika body, ukur `latencyMs`, `text→JSON?text`. Transport error → `{ok:false,status:ERROR}` tanpa throw. `checkServer`: `origin + GET /`. `joinUrl` strip trailing `/`.
- **auth.ts `login`**: reuse `credentials.token`; else `POST loginEndpoint {email,password}` → `lookupPath(data, tokenField)` (dotted, mis. `data.token`) → throw jika `!ok` / token hilang.
- **params.ts `resolvePath`**: tiap `:param`: cache → `rankCollections` → `sampleId` → prompt (hanya jika `allowPrompt = method!==GET`). Ranking: `parentCollection` (80/120), singular match + admin bonus. `sampleId`: `GET collection` + `firstResource` (`data|items|results|rows|docs|records`, cari `id|uuid|_id`). GET tak pernah prompt — langsung skip. Detail rantai + cache di section bawah.

## Param resolution (`:id` tahu dari mana)

ID tidak ditebak — **disampling hidup dari API list milik user** (terbukti smoke test: tiap endpoint dapat ID beda dari collection-nya masing-masing).

```
GET /api/plant-analysis/:analysisId
  → resolvePath ekstrak nama param ("analysisId")
  → resolveParam:
      1. cache bersama (hit? pakai langsung)
      2. rankCollections — skor kandidat GET collection:
         parent path (/api/plant-analysis) → 80, cocok persis → 120;
         singular match (param→singular vs segmen akhir) → 90 (scope sama) / 70
      3. sampleId — GET collection teratas pakai Bearer token,
         firstResource buka JSON, idOf ambil id|uuid|_id|param|base|baseId|base_id
      4. simpan ke cache + substitusi → /api/plant-analysis/d6f11fd2-…
```

- **Cache per nama param, satu `Map` untuk seluruh run** (`runner.ts:66`). Nama param beda → sampling beda (itulah kenapa `/rekomendasi` vs `/laporan` dapat ID berbeda). Nama param sama (`:id` di dua endpoint) → yang kedua reuse cache pertama.
- **Urut statis-dulu**: collection (`GET /api/x`) harus dieksekusi sebelum yang berparam (`GET /api/x/:id`) agar sampling punya data. `/test` bulk GET di-sort statis-dulu di dispatch; `send` memakai urutan scan apa adanya.
- **REPL tidak pernah prompt**: prompter `/test` selalu `async () => null`; yang tak ter-sample (list kosong) → `skipped` jujur + hint id konkret. Command-mode `send` masih prompt `inquirer` untuk non-GET.
- **Override eksplisit**: `/test GET /api/items/item-42` masuk via `RunOptions.paramDefaults` — tanpa sampling sama sekali.
- **200 + `data: [] bukan error SonicPoint**: ID tersubstitusi valid tapi tak match record (mis. reuse cache antar-param-bernama-sama atau record terhapus). Kalau butuh ID deterministik, pakai path konkret eksplisit.
- **payloads.ts `resolvePayload`**: `null` jika bukan write atau schema null. Tanpa AI → `fallbackPayload` (hanya `required`, sample: enum[0]/default/`user@example.com`/uuid/`https://...`/ISO date/`+628...`/`Sample {name}`/100/true/[]/{}). Dengan AI → `GeminiClient.generate(buildPayloadPrompt())` → `coerceToSchema()` → null jika kosong.
- **ai/client.ts**: `GeminiClient(apiKey, model=gemini-2.5-flash)`, `generateContent({responseMimeType:application/json})`, strip ` ```json `, `JSON.parse`, return object atau `null`. Tanpa env/disk/console.

## AI guide

- `isWriteMethod` = POST/PUT/PATCH saja (DELETE diabaikan — C-03 Root).
- Ubah sampling/prompt → `params.ts` + test runner. Ubah payload → `payloads.ts + ai/prompt.ts`.
