src/run/refs.ts (baru) — deteksi field referensi: nama cocok *Id / *_id / *_uuid → noun (lahanId → lahan). Petakan noun → collection: pakai ulang singular() + ranking dari params.ts (GET path yang unik cocok, skor tertinggi menang). Ekstrak id pakai firstResource/idOf yang sudah ada — jangan tulis parser baru.
src/run/payloads.ts — sebelum panggil AI: resolve semua ref lapis 1/3. Sisipkan nilai yang sudah pasti ke prompt sebagai nilai tetap ("field lahanId = <real>, copy exactly, jangan diubah"), lalu override ulang setelah AI jawab sebagai jaring pengaman (prinsipnya: AI tidak pernah boleh mengarang ref).
src/run/runner.ts — lapis 2 (chaining) sebagai setup request tersembunyi (seperti login() yang juga tak muncul di results): kalau ada producer POST/PUT untuk noun yang belum punya data, jalankan sekali, tangkap data.id, simpan ke cache. Tidak dihitung sebagai hasil tes; cukup 1 baris notis di transcript: ↳ setup: POST /api/lahan → id 6775… (untuk lahanId).
src/domain/session.ts — hasil skip tetap kind: "skipped" dengan alasan spesifik (konsisten aturan AGENTS: no parallel arrays). Web /report tidak perlu diubah — skipped sudah ada kartunya.
src/ai/prompt.ts — tambah satu baris konteks: "Field berikut adalah referensi ke entitas yang sudah ada — pakai nilai yang diberikan apa adanya".
.sonic-point.json — tambah field opsional refs (dan paramDefaults sudah ada untuk path param — sinkron). Opsional, bisa ditunda.
Cache referensi hidup di Map selama satu run (seperti cache di runner.ts sekarang) — sekali sample, dipakai berulang untuk endpoint lain, tidak GET berulang.
Kenapa ini "best practice" (dan bukan hack)
Deterministik — nilai ref berasal dari data nyata, bukan sampling LLM; hasil tes jadi bisa diandalkan.
Tanpa magic retry — tidak ada "gagal lalu tebak ulang" yang bikin report tidak jujur.
Degradasi jelas — tiap lapis punya alasan jelas saat skip, jadi demo tidak menampilkan 404 yang membingungkan juri.
Reuse — 80% logikanya (firstResource, idOf, singular, ranking) sudah ada di params.ts; tinggal diangkat jadi util bersama.
Trade-off yang perlu kamu tahu: lapis 2 berarti /test post /api/laporan di DB kosong akan diam-diam menjalankan POST /api/lahan lebih dulu (side effect nyata: 1 baris lahan baru). Karena itu saya sarankan notisnya ditampilkan, bukan benar-benar senyap.


Alurnya (per endpoint, sebelum payload dikirim)
Untuk tiap field yang terdeteksi referensi (lahanId → noun lahan), dicek berurutan:
1. Ada fixture manual di .sonic-point.json?  → pakai itu. SELESAI.
2. Ada GET collection untuk noun "lahan"?    → GET /api/lahan
      └─ ada baris?  → ambil data[0].id. SELESAI.   ← KAMU DI SINI
      └─ kosong []?  → lanjut ke 3
3. Ada POST producer "lahan" di daftar route? → POST /api/lahan (setup tersembunyi)
      └─ 2xx? → ambil data.id dari respons. SELESAI.
      └─ gagal? → lanjut ke 4
4. Skip endpoint dengan alasan jujur: "Unresolvable reference lahanId".
Jadi bukan "selalu POST dulu". Baca dulu; POST hanya kalau memang tidak ada data untuk dibaca.
Di kasusmu sekarang
Kamu sudah pernah POST /api/lahan dan DB sudah punya baris (6775320b-…, bb468d73-…). Jadi waktu /test post /api/laporan:
- noun lahanId → lahan → ketemu GET /api/lahan
- GET itu balas ["Daftar lahan berhasil diambil"] + data[0].id
- lahanId di payload diisi id itu → 201, tanpa POST dadakan, tanpa baris baru di DB
Satu GET tambahan saja (di-cache, jadi cuma sekali walau ada 5 endpoint yang butuh lahanId).
Kapan dia benar-benar "POST dadakan"
Hanya di satu kondisi: GET /api/lahan balas data: [] (DB bersih / akun juri baru register → belum punya lahan). Saat itu:
- kalau di daftar route ada POST /api/lahan → dia jalankan sekali sebagai setup, ambil data.id, lalu pakai untuk laporanId dkk.
- setup itu tidak dihitung sebagai hasil tes (keluar dari Tested 1), sama seperti login() yang sekarang juga request tersembunyi. Tapi tetap saya tampilkan 1 baris notis biar tidak bohong:
↳ setup: POST /api/lahan → 3f2a… (untuk isi lahanId)
Yang perlu kamu putuskan
Efek samping create-dadakan itu nyata (menambah 1 baris lahan di DB). Pilihan sikap:
- Aman (rekomendasi demo): hanya lapis 1 (baca). Kalau collection kosong → skip jujur, tidak pernah create. Nol efek samping, tapi /laporan tetap skip di DB kosong.
- Lengkap: lapis 1 + create-dadakan (+ fixture sebagai override). Demo selalu hijau walau DB kosong, konsekuensinya ada baris yang lahir dari tes.


saya setuju karna ini efiesien juga reuse yg sudah ada
saya tidak mau ada post dadakan klo ga ada data nya yaudah 404 gpp langsung

kombinasikan dengan Fixture di sonic-point.json, tapi otomatis, dan ini sekali saja, jadi klo next ada post yg butuh id yg sudah pernh di jaalanya dia bisa langsung ambil dari json sonic point
+Thought · 28.3s
Setuju — desainnya jadi: baca-dulu (GET sampling) + fixture otomatis di .sonic-point.json, tanpa create-dadakan. Kalau tidak ada yang bisa dipakai, ya biarkan 404. Ini yang saya maksud "sekali saja": capture pertama menulis ke JSON, run berikutnya ambil langsung dari JSON tanpa request tambahan.
Alur lengkapnya
POST /api/laporan butuh lahanId
        │
        ├─ refs.lahan ada di .sonic-point.json?  → pakai. (nol request, nol sampah)
        │
        └─ belum ada → GET /api/lahan (sampler yang sudah ada di params.ts)
                 ├─ ada baris → ambil data[0].id
                 │      └─ TULIS ke .sonic-point.json  ← sekali seumur project
                 │      └─ pakai untuk payload
                 └─ kosong / tidak ada GET collection → biarkan nilai AI apa adanya
                          → server balas 404, tercatat failed. Titik. Tidak ada POST dadakan.
Jadi urutan hidupnya:
1. Run ke-1 /test post /api/laporan → GET /api/lahan → simpan refs.lahan ke JSON → lahanId terisi → 201.
2. Run ke-2, ke-3, seterusnya (dan endpoint lain yang butuh lahan) → baca JSON saja, tanpa GET sama sekali. Cepat, hemat, tidak menyentuh DB.
Bentuk di .sonic-point.json
Kunci-nya noun, bukan nama field, biar satu nilai bisa dipakai lahanId, lahan_id, atau id_lahan sekaligus:
{
  "baseUrl": "http://localhost:3000",
  "loginEndpoint": "/api/auth/login",
  "email": "...",
  "password": "...",
  "tokenField": "data.token",
  "token": "eyJ...",
  "refs": {
    "lahan": {
      "id": "6775320b-85c0-421e-a83f-b72a1315f46a",
      "source": "GET /api/lahan",
      "capturedAt": "2026-10-17T02:14:03.000Z"
    }
  }
}




Boleh, dan sebenarnya flat + satu pengaman kecil itu malah pilihan paling pas. Perbandingannya jujur:
 	Flat murni	Flat + penanda host	Per-baseUrl bucket
Dibaca/diedit tangan	paling enak	enak	agak berlapis
Ganti env di folder yang sama	id env lama dipakai → 404 sekali → baru self-heal	langsung salah-kena-deteksi → re-sample sekali → benar	dua-duanya tersimpan, tidak ada re-sample
Kode	paling sedikit	+1 baris cek	normalisasi bucket + nesting
Kasus 1 env (case kamu)	sama	sama	sama
Kuncinya: kasusmu cuma satu backend (Express lokal :3000). Jadi bedanya cuma muncul kalau kamu pindah-pindah env di folder yang sama — dan itu jarang. Flat murni pun "berfungsi", cuma boros satu siklus 404 yang tidak perlu.
Jadi rekomendasi saya: flat, tapi tiap entri mencatat dari host mana dia diambil, dan dibaca hanya kalau host-nya cocok.
"refs": {
  "lahan": {
    "id": "6775320b-85c0-421e-a83f-b72a1315f46a",
    "source": "GET /api/lahan",
    "host": "http://localhost:3000",
    "capturedAt": "2026-10-17T02:14:03.000Z"
  }
}
Perilakunya:
- host cocok → pakai (nol request). Ini jalur normal kamu.
- host beda (kamu ganti baseUrl) → dianggap miss → sample ulang → timpa entri itu. Satu GET, lalu beres. Tidak ada 404 sia-sia, tidak ada nesting.
- stale → sample ulang seperti biasa.
Untungnya: JSON tetap rata (refs.lahan.id), enak dilihat/diedit tangan, kode hampir sesederhana flat murni, tapi tetap benar saat pindah env. Kekurangannya cuma: kalau kamu bolak-balik antara dua env, tiap balik-balik kena 1 GET lagi (karena cuma ada satu slot per noun) — untuk demo, itu tidak masalah.