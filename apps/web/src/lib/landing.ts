/**
 * Semua konten landing dalam satu tempat — komponen tetap tipis & reusable.
 * Terminal/FAQ memakai model segmen (`Seg`) supaya pewarnaan teks tidak
 * bocor jadi string HTML; renderernya `components/Segs.tsx`.
 */

/* ── Model segmen teks ───────────────────────────────────────────────────── */

export type Tone =
  | "white"
  | "mist"
  | "dim"
  | "smoke"
  | "amber"
  | "gold"
  | "ok"
  | "err"
  | "warn";

export type Seg = { text: string; tone?: Tone; code?: boolean };
export type Line = Seg[];

/** teks bernada eksplisit */
const s = (text: string, tone?: Tone): Seg => ({ text, tone });
/** inline code: mono + mist */
const cd = (text: string): Seg => ({ text, code: true });

/* ── Navigasi & instalasi ────────────────────────────────────────────────── */

export const navLinks = [
  { href: "#preview", label: "Interactive CLI" },
  { href: "#ast-lab", label: "AST & Schema Lab" },
  { href: "#features", label: "Kapabilitas" },
  { href: "#report-preview", label: "Live Report" },
  { href: "#commands", label: "Command" },
  { href: "#faq", label: "FAQ" },
];

export type PkgManager = { key: string; label: string; cmd: string };

export const pkgManagers: PkgManager[] = [
  { key: "npm", label: "npm", cmd: "npm install -g sonic-point" },
  { key: "pnpm", label: "pnpm", cmd: "pnpm add -g sonic-point" },
  { key: "bun", label: "bun", cmd: "bun add -g sonic-point" },
  { key: "npx", label: "npx (tanpa install)", cmd: "npx sonic-point@latest send" },
];

/* ── Hero ────────────────────────────────────────────────────────────────── */

export type Metric = {
  label: string;
  value: string;
  tone: "white" | "amber";
  hint: string;
};

/** Klaim jujur: tanpa benchmark rekaan — semua bisa diverifikasi di repo/docs. */
export const metrics: Metric[] = [
  {
    label: "Penemuan Endpoint",
    value: "AST Express",
    tone: "white",
    hint: "Mount prefix diikuti, import relatif di-resolve",
  },
  {
    label: "ID Relasi Palsu",
    value: "0",
    tone: "amber",
    hint: "ID disampel dari GET milikmu, lalu di-cache",
  },
  {
    label: "Validator Didukung",
    value: "Joi · Zod · Yup",
    tone: "white",
    hint: "Dibaca otomatis dari AST",
  },
  {
    label: "Boilerplate Test",
    value: "0 baris",
    tone: "amber",
    hint: "Tanpa koleksi Postman manual",
  },
];

/* ── Terminal workbench ──────────────────────────────────────────────────── */

export const terminalTabs = ["scan", "schema", "context", "test", "report"] as const;
export type TerminalTabKey = (typeof terminalTabs)[number];

export type TerminalPreset = {
  prompt: string;
  heading: string;
  badge: string;
  status: string;
  lines: Line[];
  json: string;
};

export type WorkbenchEndpoint = {
  id: number;
  method: string;
  path: string;
  schema: string;
  status: string;
  statusTone: "ok" | "err" | "warn";
  latency: string;
  detail: Line[];
  jsonPreview: string;
};

/** URL demo — samakan dengan laporan mock di report preview. */
export const demoReport = {
  url: "https://sonicpoint.vercel.app/report/8f2c1d3e-5b47-4a9e-8c21-7d6f0a4b9e3c",
  target: "http://localhost:4000",
  duration: "312 ms",
};

export const workbenchEndpoints: WorkbenchEndpoint[] = [
  {
    id: 0,
    method: "POST",
    path: "/api/v1/auth/login",
    schema: "Zod · loginSchema",
    status: "200 OK",
    statusTone: "ok",
    latency: "38ms",
    detail: [
      [s("$ sonic-point send --method POST /api/v1/auth/login", "white")],
      [s("• Mount prefix "), s("/api/v1/auth", "mist"), s(" di-resolve dari "), s("src/app.ts", "mist")],
      [s("• Zod schema terbaca: "), s("email (string, email), password (string, min:8)", "mist")],
      [s("• Login sukses ⇒ "), s("data.accessToken", "mist"), s(" disimpan sebagai Bearer token")],
      [s("✓ 200 OK", "ok"), s(" dalam 38ms — token siap untuk sampling berikutnya")],
    ],
    jsonPreview:
      '// Konteks token hasil ekstraksi\n{ "status": "authenticated", "tokenField": "data.accessToken", "bearer": "eyJhbGciOiJIUzI1NiIs..." }',
  },
  {
    id: 1,
    method: "GET",
    path: "/api/v1/lahan",
    schema: "Query · paginationSchema",
    status: "200 OK",
    statusTone: "ok",
    latency: "24ms",
    detail: [
      [s("$ sonic-point send --method GET /api/v1/lahan", "white")],
      [s("• Sampling collection GET dengan Bearer token...")],
      [s("• Terkumpul "), s("14 ID asli", "mist"), s(" untuk "), s("lahanId", "mist")],
      [s("• Contoh tersimpan: "), s('"lhn_01H9X8K2P9"', "mist"), s(" (cache sesi)")],
      [s("✓ 200 OK", "ok"), s(" dalam 24ms — tanpa UUID karangan")],
    ],
    jsonPreview:
      '// ID relasi dari GET /api/v1/lahan\n{ "resource": "lahan", "key": "lahanId", "samples": ["lhn_01H9X8K2P9", "lhn_01H9X8M4R2", "+12 lainnya"] }',
  },
  {
    id: 2,
    method: "POST",
    path: "/api/v1/panen",
    schema: "Joi · createPanenSchema",
    status: "201 Created",
    statusTone: "ok",
    latency: "61ms",
    detail: [
      [s("$ sonic-point send --method POST /api/v1/panen", "white")],
      [s("• Constraint schema: "), s("lahanId (required), beratKg (number, min:1), tanggal (isoDate)", "mist")],
      [s("• Menyisipkan "), s('lahanId: "lhn_01H9X8K2P9"', "mist"), s(" asli dari cache GET /api/v1/lahan")],
      [s("• Payload disusun mengikuti aturan Joi")],
      [s("✓ 201 Created", "ok"), s(" dalam 61ms — respons masuk ke laporan sesi")],
    ],
    jsonPreview:
      '// Payload terkirim → POST /api/v1/panen\n{ "lahanId": "lhn_01H9X8K2P9", "beratKg": 420, "tanggal": "2026-05-12T08:30:00.000Z" }',
  },
  {
    id: 3,
    method: "PATCH",
    path: "/api/v1/items/:itemId",
    schema: "Yup · updateItemSchema",
    status: "200 OK",
    statusTone: "ok",
    latency: "44ms",
    detail: [
      [s("$ sonic-point send --method PATCH /api/v1/items/:itemId", "white")],
      [s("• Param "), s(":itemId", "mist"), s(" diisi sampel asli "), s('"itm_88412"', "mist")],
      [s("• Constraint Yup divalidasi lewat parser AST")],
      [s("✓ 200 OK", "ok"), s(" dalam 44ms — perubahan state terverifikasi")],
    ],
    jsonPreview:
      '// URL ter-resolve: PATCH /api/v1/items/itm_88412\n{ "nama": "Pupuk Organik Granul", "stokMinimum": 25, "aktif": true }',
  },
  {
    id: 4,
    method: "DELETE",
    path: "/api/v1/items/:itemId",
    schema: "Auth · requireRole('admin')",
    status: "SKIPPED",
    statusTone: "warn",
    latency: "—",
    detail: [
      [s("$ sonic-point send --method DELETE /api/v1/items/:itemId", "white")],
      [s("• Tidak ada payload yang bisa disusun dari schema untuk method DELETE")],
      [s("• Dicatat sebagai "), s("SKIPPED", "warn"), s(" di laporan dengan alasan eksplisit:")],
      [s('  "No request payload could be generated for DELETE /api/v1/items/:itemId."', "dim")],
    ],
    jsonPreview:
      '// Entri jujur di laporan\n{ "status": "SKIPPED", "reason": "No request payload could be generated for DELETE /api/v1/items/:itemId." }',
  },
];

export const tabPresets: Record<TerminalTabKey, TerminalPreset> = {
  scan: {
    prompt: "sonic-point > /scan",
    heading: "AST Router Scanner",
    badge: "5 endpoint terdeteksi",
    status: "AST scan selesai · 0 import melingkar nyangkut",
    lines: [
      [s("$ /scan", "white")],
      [s("• Entrypoint: "), s("src/server.ts", "mist"), s(" → "), s("src/routes/index.ts", "mist")],
      [s("• Mengikuti import relatif & prefix "), s("router.use('/v1', v1Router)", "mist")],
      [s("• Menemukan "), s("18 route", "white"), s(" di 5 modul controller (Joi, Zod, Yup)")],
      [s("• Pilih endpoint di panel kiri untuk melihat detail eksekusi.", "dim")],
    ],
    json: '// Ringkasan graf AST\n{ "filesParsed": 23, "circularImportsIgnored": 2, "validators": ["zod", "joi", "yup"] }',
  },
  schema: {
    prompt: "sonic-point > /schema POST /api/v1/panen",
    heading: "Validation Schema AST Inspector",
    badge: "Joi + Zod + Yup",
    status: "Schema terbaca · fallback deterministik siap",
    lines: [
      [s("$ /schema POST /api/v1/panen", "white")],
      [s("• Validator: "), s("Joi.object()", "mist"), s(" di "), s("src/validators/panen.validator.ts:14", "mist")],
      [s("  ├─ "), s("lahanId", "white"), s(": string · required · relasional (disampel dari GET /api/v1/lahan)")],
      [s("  ├─ "), s("beratKg", "white"), s(": number · required · min(1) · max(5000)")],
      [s("  └─ "), s("catatan", "white"), s(": string · optional · max(140)")],
      [s("• Generator payload: "), s("AI aktif", "mist"), s(" (fallback deterministik tetap jalan)")],
    ],
    json: '// Schema descriptor hasil normalisasi\n{ "lahanId": { "type": "string", "ref": "/api/v1/lahan" }, "beratKg": { "type": "number", "min": 1, "max": 5000 } }',
  },
  context: {
    prompt: "sonic-point > /context",
    heading: "Relational ID Session Cache",
    badge: "36 ID asli di-cache",
    status: "Cache sehat · resample otomatis saat terbukti basi",
    lines: [
      [s("$ /context", "white")],
      [s("• Bearer token aktif: "), s("Valid (kedaluwarsa 54 mnt lagi)", "ok")],
      [s("• "), s("lahanId", "white"), s(" (dari GET /api/v1/lahan): "), s("14 ID di-cache", "mist")],
      [s("• "), s("itemId", "white"), s(" (dari GET /api/v1/items): "), s("22 ID di-cache", "mist")],
      [s("• Tidak ada UUID sintetis yang akan dipakai saat /test.", "dim")],
    ],
    json: '// Live Context Store\n{ "lahanId": ["lhn_01H9X8K2P9", "lhn_01H9X8M4R2"], "itemId": ["itm_88412", "itm_88419"] }',
  },
  test: {
    prompt: "sonic-point > /test",
    heading: "Live Contract Execution",
    badge: "Bearer auth aktif",
    status: "16 lolos · 1 gagal · 1 di-skip",
    lines: [
      [s("$ /test", "white")],
      [s("• Login via "), s("POST /api/v1/auth/login", "mist"), s(" → tokenField "), s("data.accessToken", "mist")],
      [s("• Pre-sampling ID relasi: "), s("itemId (22)", "mist"), s(", "), s("lahanId (14)", "mist")],
      [s("• Mengeksekusi 18 endpoint berurutan dengan konteks relasi asli...")],
      [
        s("• "),
        s("16 lolos", "ok"),
        s(", "),
        s("1 gagal (500 di PUT /api/v1/stok)", "err"),
        s(", "),
        s("1 di-skip (alasan tercatat)", "warn"),
      ],
    ],
    json: '// Execution Summary\n{ "total": 18, "passed": 16, "failed": 1, "skipped": 1, "durationMs": 312 }',
  },
  report: {
    prompt: "sonic-point > /report",
    heading: "Honest Swagger-style Report",
    badge: "URL publik",
    status: "Terbit · payload, respons & latensi ikut",
    lines: [
      [s("$ /report", "white")],
      [s("• Mengemas payload request, respons server, status HTTP & latensi...")],
      [s("• Yang gagal ditulis gagal; route yang di-skip menyebut alasan persisnya.")],
      [s("• Link sesi terbit:")],
      [s(demoReport.url, "gold")],
    ],
    json: `// Report Artifact Published\n{ "url": "${demoReport.url}", "public": true }`,
  },
};

/* ── AST & Schema Lab ────────────────────────────────────────────────────── */

export const validatorKeys = ["zod", "joi", "yup"] as const;
export type ValidatorKey = (typeof validatorKeys)[number];

export type LabData = {
  file: string;
  source: string;
  ast: string;
  payload: string;
};

export const labLabels: Record<ValidatorKey, string> = {
  zod: "Zod Schema",
  joi: "Joi Schema",
  yup: "Yup Schema",
};

export const validatorLab: Record<ValidatorKey, LabData> = {
  zod: {
    file: "src/routes/panen.zod.ts",
    source: `const createPanenSchema = z.object({
  lahanId: z.string().uuid(),
  komoditas: z.enum(["PADI", "JAGUNG", "TEBU"]),
  beratKg: z.number().int().min(10).max(5000),
  kadarAir: z.number().min(8).max(30).optional(),
});

router.post("/panen", validate(createPanenSchema), ctrl);`,
    ast: `Endpoint : POST /api/v1/panen
Validator: ZodObject (4 properties)

• lahanId   [required] string (uuid) → Relational Ref
• komoditas [required] enum("PADI"|"JAGUNG"|"TEBU")
• beratKg   [required] number (int, min:10, max:5000)
• kadarAir  [optional] number (min:8, max:30)`,
    payload: `{
  "lahanId": "lhn_01H9X8K2P9",
  "komoditas": "PADI",
  "beratKg": 1240,
  "kadarAir": 14.2
}`,
  },
  joi: {
    file: "src/routes/panen.joi.js",
    source: `const createPanenSchema = Joi.object({
  lahanId: Joi.string().required(),
  komoditas: Joi.string().valid("PADI", "JAGUNG").required(),
  beratKg: Joi.number().min(10).max(5000).required(),
  catatan: Joi.string().max(120).optional(),
});

router.post("/panen", validateBody(createPanenSchema), ctrl);`,
    ast: `Endpoint : POST /api/v1/panen
Validator: Joi.object (4 keys)

• lahanId   [required] string → Sampled from GET /lahan
• komoditas [required] valid("PADI", "JAGUNG")
• beratKg   [required] number (min:10, max:5000)
• catatan   [optional] string (max:120)`,
    payload: `{
  "lahanId": "lhn_01H9X8K2P9",
  "komoditas": "JAGUNG",
  "beratKg": 850,
  "catatan": "Panen blok selatan kondisi cerah"
}`,
  },
  yup: {
    file: "src/routes/panen.yup.ts",
    source: `const createPanenSchema = yup.object({
  lahanId: yup.string().required(),
  beratKg: yup.number().positive().min(10).required(),
  petugasEmail: yup.string().email().required(),
  terverifikasi: yup.boolean().default(true),
});

router.post("/panen", useYup(createPanenSchema), ctrl);`,
    ast: `Endpoint : POST /api/v1/panen
Validator: Yup.object (4 fields)

• lahanId       [required] string → Sampled from GET /lahan
• beratKg       [required] number (positive, min:10)
• petugasEmail  [required] string (format: email)
• terverifikasi [optional] boolean (default: true)`,
    payload: `{
  "lahanId": "lhn_01H9X8K2P9",
  "beratKg": 620,
  "petugasEmail": "mandor.blok4@kebun.id",
  "terverifikasi": true
}`,
  },
};

/* ── Report preview ──────────────────────────────────────────────────────── */

export type ReportItem = {
  id: string;
  method: string;
  path: string;
  status: number | "SKIPPED";
  success: boolean;
  latency: string;
  summary: string;
  reqBody: string;
  resBody: string;
};

export const reportItems: ReportItem[] = [
  {
    id: "rep-1",
    method: "POST",
    path: "/api/v1/panen",
    status: 201,
    success: true,
    latency: "61ms",
    summary: "Panen dibuat memakai lahanId hasil sampling",
    reqBody: `{
  "lahanId": "lhn_01H9X8K2P9",
  "beratKg": 420,
  "tanggal": "2026-05-12T08:30:00.000Z"
}`,
    resBody: `{
  "success": true,
  "data": {
    "id": "pnn_99201",
    "lahanId": "lhn_01H9X8K2P9",
    "beratKg": 420
  }
}`,
  },
  {
    id: "rep-2",
    method: "PATCH",
    path: "/api/v1/items/itm_88412",
    status: 200,
    success: true,
    latency: "44ms",
    summary: "Item inventaris diperbarui lewat kontrak Yup",
    reqBody: `{
  "nama": "Pupuk Organik Granul",
  "stokMinimum": 25
}`,
    resBody: `{
  "success": true,
  "updatedAt": "2026-05-12T08:30:01.104Z"
}`,
  },
  {
    id: "rep-3",
    method: "PUT",
    path: "/api/v1/stok/recalculate",
    status: 500,
    success: false,
    latency: "183ms",
    summary: "Gagal jujur: null pointer di service gudang",
    reqBody: `{
  "gudangId": "gdg_01H4Z9",
  "forceSync": true
}`,
    resBody: `{
  "error": "InternalServerError",
  "message": "Cannot read properties of null (reading 'kapasitasMaks')",
  "hint": "src/services/stok.service.ts:88"
}`,
  },
  {
    id: "rep-4",
    method: "DELETE",
    path: "/api/v1/items/:itemId",
    status: "SKIPPED",
    success: false,
    latency: "—",
    summary: "DELETE di-skip: payload tak bisa disusun",
    reqBody: "// Tidak ada request dikirim\n// (payload tidak bisa disusun dari schema)",
    resBody:
      '// Alasan tercatat di laporan:\n// "No request payload could be generated for DELETE /api/v1/items/:itemId."',
  },
];

/* ── Fitur, perbandingan, command, FAQ ───────────────────────────────────── */

export type FeatureIconKey = "scan" | "schema" | "link" | "key" | "terminal" | "share";

export type FeatureCard = {
  icon: FeatureIconKey;
  badge: string;
  badgeTone: "neutral" | "amber" | "gold";
  variant: "key" | "amber" | "gold";
  title: string;
  body: string;
};

export const featureCards: FeatureCard[] = [
  {
    icon: "scan",
    badge: "AST Walker",
    badgeTone: "neutral",
    variant: "key",
    title: "Scan dari AST",
    body: "Endpoint ditemukan dari kode: mount prefix diikuti, import relatif di-resolve, dan import melingkar tidak membuat scanner tersesat.",
  },
  {
    icon: "schema",
    badge: "AI + Fallback",
    badgeTone: "amber",
    variant: "amber",
    title: "Payload dari schema validasimu",
    body: "Joi, Zod, dan Yup dipindai menjadi field required/optional beserta constraint-nya. AI mengisi payload; tanpa AI, fallback deterministik tetap jalan.",
  },
  {
    icon: "link",
    badge: "Live ID Cache",
    badgeTone: "neutral",
    variant: "key",
    title: "Relasi yang tidak dikarang",
    body: "ID relasi (lahanId, itemId) disampel dari collection GET milikmu, di-cache per host, lalu di-resample otomatis saat terbukti basi. Nol data palsu.",
  },
  {
    icon: "key",
    badge: "Bearer Token",
    badgeTone: "neutral",
    variant: "key",
    title: "Auth-aware",
    body: "Login sekali lewat login endpoint, token diambil dari tokenField, lalu dipakai sebagai Bearer di semua request — termasuk saat sampling.",
  },
  {
    icon: "terminal",
    badge: "Unified REPL",
    badgeTone: "neutral",
    variant: "key",
    title: "Satu prompt untuk semuanya",
    body: "/scan, /schema, /context, /test, /report, dan /config bekerja tanpa keluar dari REPL — memakai engine yang sama dengan command mode.",
  },
  {
    icon: "share",
    badge: "Swagger-like UI",
    badgeTone: "gold",
    variant: "gold",
    title: "Laporan yang jujur",
    body: "Request body, respons, status, dan latensi per endpoint dalam satu halaman ala Swagger. Yang gagal ditulis gagal, yang di-skip menyebut alasannya.",
  },
];

export type ComparisonRow = { dim: string; sonic: Line; postman: Line; swagger: Line };

export const comparisonRows: ComparisonRow[] = [
  {
    dim: "Penemuan endpoint",
    sonic: [s("Otomatis dari AST Express", "mist")],
    postman: [s("Input URL satu per satu")],
    swagger: [s("Tulis komentar YAML manual")],
  },
  {
    dim: "Sinkronisasi schema validasi",
    sonic: [s("Langsung baca Joi / Zod / Yup", "mist")],
    postman: [s("Sering lupa di-update saat PR")],
    swagger: [s("Duplikasi definisi schema")],
  },
  {
    dim: "Foreign key (*Id)",
    sonic: [s("Auto-sample dari GET & cache", "mist")],
    postman: [s("Copy-paste ID manual antar tab")],
    swagger: [s("Default "), cd('"string"'), s(" → gagal 400")],
  },
  {
    dim: "Berbagi hasil eksekusi",
    sonic: [s("Satu perintah → link publik", "mist")],
    postman: [s("Export JSON / screenshot")],
    swagger: [s("Hanya dokumentasi statis")],
  },
];

export type SlashCommand = { cmd: string; abbr: string; desc: string };

export const slashCommands: SlashCommand[] = [
  { cmd: "/scan", abbr: "/sc", desc: "Telusuri ulang AST & mount router Express" },
  { cmd: "/schema", abbr: "/sh", desc: "Inspeksi constraint Joi, Zod, atau Yup" },
  { cmd: "/context", abbr: "/cx", desc: "Lihat cache ID relasi hasil sampling GET" },
  { cmd: "/test", abbr: "/ts", desc: "Eksekusi pengujian penuh atau per-endpoint" },
  { cmd: "/report", abbr: "/rp", desc: "Terbitkan laporan sesi ke URL publik" },
  { cmd: "/config", abbr: "/cf", desc: "Atur baseUrl, login endpoint, & tokenField" },
];

export type FaqItem = { q: string; a: Line };

/** Jawaban diselaraskan dengan perilaku CLI sebenarnya (lihat docs/faq.mdx). */
export const faqItems: FaqItem[] = [
  {
    q: "Bagaimana jika saya tidak mengatur API key AI? Apakah tetap jalan?",
    a: [
      s("Tetap jalan. Tanpa key, payload disusun oleh "),
      s("fallback deterministik", "mist"),
      s(" yang membaca tipe, constraint, enum, dan format dari AST Joi/Zod/Yup — tanpa memanggil LLM. AI hanya membuat payload lebih realistis untuk skema yang kompleks."),
    ],
  },
  {
    q: "Aman dijalankan di database staging? Bagaimana dengan endpoint DELETE?",
    a: [
      s("SonicPoint mengirim request sungguhan, termasuk route tulis dan DELETE — tidak ada mode aman otomatis. Karena itu arahkan "),
      cd("baseUrl"),
      s(" ke environment staging/seed, atau uji ke database dev. SonicPoint tidak pernah membuat data sendiri: ID relasi hanya disampel dari GET milikmu, dan route yang payload-nya tidak bisa disusun dicatat "),
      s("SKIPPED", "warn"),
      s(" beserta alasannya."),
    ],
  },
  {
    q: "Bagaimana SonicPoint tahu field mana yang merupakan ID relasi?",
    a: [
      s("Nama field diurai menjadi “noun” ("),
      cd("lahanId"),
      s(" → "),
      cd("lahan"),
      s("), lalu dicocokkan dengan route koleksi "),
      s("GET", "mist"),
      s(" statis yang ditemukan saat scan. Nilai id-nya disampel dari respons milikmu dan di-cache per host di "),
      cd(".sonic-point.json"),
      s("."),
    ],
  },
  {
    q: "Apakah kode sumber aplikasi saya diunggah saat menjalankan /report?",
    a: [
      s("Tidak. AST parsing berjalan 100% lokal di mesinmu. Yang ikut terbit ke link laporan hanya data hasil tes: method, path, payload uji, preview respons, status, dan latensi. "),
      cd("--snippets"),
      s(" mencetak potongan kode hanya di terminal lokalmu."),
    ],
  },
];

export const limitations: Line[] = [
  [s("Fokus penuh pada ekosistem "), s("Express.js", "mist"), s(" (Fastify & Hono masih di roadmap).")],
  [s("Resolusi modul mengutamakan import relatif standar & path alias TypeScript dasar.")],
  [s("REPL butuh TTY; di CI pakai command mode ("), cd("scan"), s(", "), cd("send"), s(", "), cd("report"), s(").")],
];
