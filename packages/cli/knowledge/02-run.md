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
  - src/run/resources.ts
  - src/run/refs.ts
  - src/run/payloads.ts
  - src/domain/ref.ts
  - src/ai/client.ts
  - src/ai/prompt.ts
---

# Run Pipeline (`send`)

`runSession(targets, options)` return `TestSession`. Tanpa `console.*`.

## Loop (`runner.ts`)

`targets kosong → RunError` → `login()` → cache token ke `.sonic-point.json` jika awalnya kosong → `checkServer()` → `loadSchemas` via `buildApiGraph` (hanya jika ada write-method) → `RefResolver` (hanya jika ada write-method) → per target: `resolvePath → resolvePayload (write only) → request → tandai stale kalau not-found → push executed` → `saveRefs` (kalau ada capture/stale baru) → `store.save(session)`.

## Modul

- **http.ts**: `request(method,url,token,fetch,body?)` selalu `Authorization: Bearer`, `Content-Type` jika body, ukur `latencyMs`, `text→JSON?text`. Transport error → `{ok:false,status:ERROR}` tanpa throw. `checkServer`: `origin + GET /`. `joinUrl` strip trailing `/`.
- **auth.ts `login`**: reuse `credentials.token`; else `POST loginEndpoint {email,password}` → `lookupPath(data, tokenField)` (dotted, mis. `data.token`) → throw jika `!ok` / token hilang.
- **params.ts `resolvePath`**: tiap `:param`: cache → `rankCollections` → `sampleId` → prompt (hanya jika `allowPrompt = method!==GET`). Ranking: `parentCollection` (80/120), singular match + admin bonus. `sampleId`: `GET collection` + `firstResource` (`data|items|results|rows|docs|records`, cari `id|uuid|_id`). GET tak pernah prompt — langsung skip. Detail rantai + cache di section bawah.
- **resources.ts**: pembaca JSON + helper nama route yang dipakai bersama `params.ts` (path param) dan `refs.ts` (body FK): `firstResource`, `idOf`, `referenceNoun`, `idKeysFor`, `collectionCandidates`, `dynamicParams`, `singular`, `stripTrailingSlash`, dll. Tidak ada duplikasi sampler antar dua fitur.

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
- **payloads.ts `resolvePayload`**: `null` jika bukan write atau schema null. Dengan AI → resolve FK dulu (lihat bawah) → `GeminiClient.generate(buildPayloadPrompt(endpoint, schema, pinned))` → `coerceToSchema()` → nilai FK di-pin ulang (menang atas keluaran model) → null jika kosong. Tanpa AI → `fallbackPayload` (hanya `required`, sample: enum[0]/default/`user@example.com`/uuid/`https://...`/ISO date/`+628...`/`Sample {name}`/100/true/[]/{}) → FK di-pin.
- **ai/client.ts**: `GeminiClient(apiKey, model=gemini-2.5-flash)`, `generateContent({responseMimeType:application/json})`, strip ` ```json `, `JSON.parse`, return object atau `null`. Tanpa env/disk/console.

## Reference id (`lahanId` dan FK body lain — contoh)

Masalah: AI tidak tahu id yang ada di DB user — dia mengarang UUID valid → backend balas 404 "tidak ditemukan" (bukan bug scanner, tapi dependensi data). Solusi: **sampling id dari API user sendiri, lalu cache ke `.sonic-point.json`** (lihat [[04-config]] untuk bentuk file).

> Catatan: contoh di halaman ini memakai app user (`lahan`); **suite tes** memakai nama netral (`item`/`order`/`createItemSchema`) supaya repo publik tetap bisa dibaca orang lain — C-ADR-20.

```
POST /api/laporan butuh lahanId
  1. refs.lahan ada di .sonic-point.json, host cocok, tidak stale → pakai (NOL request)
  2. belum ada / host beda / stale → GET collection (collectionCandidates noun)
        ada baris → data[0].id → pakai + TULIS (sekali) + notice
        kosong / tak ada collection GET → payload AI dibiarkan apa adanya → 404 dicatat wajar
  3. setelah request: 404 atau pesan not-found, dan nilai tadi dari cache → tandai stale
     → run berikutnya resample sendiri (self-heal)
```

- **Deteksi field**: `referenceNoun(name)` — `lahanId` / `lahan_id` / `id_lahan` / `plantAnalysisId` / `itemUuid` → noun (`lahan`, `plant-analysis`, `item`). `id`/`uuid` polos sengaja TIDAK match (itu id resource-nya sendiri).
- **Mapping noun → collection**: `collectionCandidates` — skor 100 kalau segmen akhir GET statis cocok persis, 90 kalau cocok setelah `singular()`; route ber-`:param` tidak pernah jadi kandidat. Filter per-run + memo `Map`: satu noun = maksimal satu GET per run.
- **Nilai FK menang**: prompt AI memuat blok `Resolved field values — copy exactly, never invent` DAN hasil akhir di-`pin` ulang setelah koersi. Jadi invent-UUID tidak mungkin sampai ke server.
- **Tidak pernah create**: producer (`POST /api/lahan`) tidak pernah dijalankan sendiri. Cache kosong = gagal jujur.
- **Stale hanya dari cache**: 404 pada payload yang FK-nya hasil sample *run ini* tidak menandai apa-apa (itu masalah data, bukan cache).
- **Cache per host**: `refs[noun].host` = `baseUrl` ternormalisasi. Ganti baseUrl → dianggap miss → resample sekali (bukan 404 sia-sia).
- **Gagal sampling, cache ada**: nilai cache dari host yang sama tetap dipakai (lebih baik dari UUID karangan); flag `stale` tetap menyala.
- **Satu tulis per run**: `RefResolver` menampung perubahan → `saveRefs()` read-modify-write di akhir run (kredensial/`token` tidak pernah tertimpa; file tidak dibuat kalau belum ada).
- **Notice** (satu baris, bukan hasil tes): `↳ refs.lahan = <id> (saved)` / `↳ refs.lahan was stale — refreshed to <id>`, lewat `RunEvents.refSampled` → CLI print (`renderRefNotices`) dan TUI prepend ke baris `/test`.
- Verifikasi: `tests/refs.test.ts` (deteksi noun, ranking, cache-hit nol fetch, host-beda, stale→refresh, sampling kosong) + `tests/refs-run.test.ts` e2e 5 run (capture → cache-hit → 404→stale → self-heal → teks not-found non-404) — 117/117 hijau; suite netral + type-checked (C-ADR-20).

## AI guide

- `isWriteMethod` = POST/PUT/PATCH saja (DELETE diabaikan — C-03 Root).
- Ubah sampling/prompt → `params.ts` + test runner. Ubah payload → `payloads.ts + ai/prompt.ts`.
- Ubah cara baca id/koleksi → `resources.ts` (dipakai path param DAN body FK — jangan duplikasi di `params.ts`).
- Ubah aturan cache FK (host/stale/create) → `refs.ts` + ADR-08 Root (aturan produk: TIDAK pernah create data).
