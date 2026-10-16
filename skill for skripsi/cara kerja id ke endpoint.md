Iya, tebakanmu tepat 100% — dan output-mu sendiri adalah buktinya. Perhatikan:
Bukti dari output-mu sendiri
Perintah keduamu (/test get /api/notifikasi/) nge-GET list-nya, dan item pertama list itu:
"id": "5020faf2-3cb9-4cfb-9e8a-76c1120e7843"
…persis sama dengan ID yang dipakai di perintah pertama (/api/notifikasi/5020faf2-…). Jadi urutan kejadiannya saat kamu ketik perintah pertama:
1. Kamu ketik:  /test GET /api/notifikasi/:notifikasiId
2. Dia sadar:   "ada :notifikasiId nih, gue butuh nilai konkret"
3. Dia GET:     /api/notifikasi  (collection/list — full response diambil)
4. Dia comot:   SATU id — item PERTAMA di list (5020faf2-…)
5. Dia tembak:  /api/notifikasi/5020faf2-…  → 200 ✓
Cara milih collection + ID-nya (mekanisme, bukan sulap)
1. Cari collection yang cocok (rankCollections): dari template /api/notifikasi/:notifikasiId, kandidat terbaik = parent path /api/notifikasi (skor tertinggi, 120). Jadi dia tidak asal GET semua endpoint — hanya SATU collection yang paling cocok per param.
2. Ambil SATU id (sampleId): GET collection itu, buka JSON-nya (ngerti wrapper data|items|results|…), ambil resource pertama, baca field prioritas id → uuid → _id → …. List-nya boleh 100 item — yang dipakai cuma item pertama.
3. Cache per nama param: dalam satu run, :notifikasiId yang sudah ter-resolve dipakai ulang kalau muncul lagi. Makanya bulk GET cepat — tiap param cuma sampling sekali.
Yang TIDAK dia lakukan
- Tidak mengiterasi semua ID (satu param = satu ID = satu request detail). Kalau kamu mau "test semua ID di list", itu fitur lain (bulk expand) — belum ada.
- Tidak ngarang ID. Kalau list kosong / tidak ada collection cocok → hasil SKIPPED jujur + hint id konkret, persis yang sudah didokumentasikan di vault kemarin.
Singkatnya: GET list dulu semuanya, comot ID pertama, tembak detail — dan output keduamu adalah rekaman "penodongannya" secara live. Kerennya lagi, ini bekerja generik untuk semua resource (plant-analysis, rekomendasi, laporan, notifikasi) tanpa config per-endpoint.