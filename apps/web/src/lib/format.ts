/** Helper presentasi kecil — dipakai report viewer (server & client). */

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Response preview bisa JSON atau teks biasa; pretty-print hanya kalau JSON. */
export function prettyMaybeJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return text;
  }
}

/** CLI menyimpan skip sebagai status_code "SKIPPED" (teks), bukan angka. */
export function isSkippedStatus(statusCode: number | string | null): boolean {
  return typeof statusCode === "string" && statusCode.toUpperCase() === "SKIPPED";
}

export function formatLatency(latencyMs: number, skipped: boolean): string {
  return skipped ? "—" : `${latencyMs} ms`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} mnt ${rest} dtk`;
}
