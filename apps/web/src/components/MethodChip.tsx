/** Chip method bergaya Swagger (varian dark) — border + teks, bukan fill besar.
 *  Warna method = warna fungsional yang membawa data, bukan dekorasi. */
const TONES: Record<string, string> = {
  GET: "border-method-get/40 bg-method-get/10 text-method-get",
  POST: "border-method-post/40 bg-method-post/10 text-method-post",
  PUT: "border-method-put/40 bg-method-put/10 text-method-put",
  PATCH: "border-method-patch/40 bg-method-patch/10 text-method-patch",
  DELETE: "border-method-delete/40 bg-method-delete/10 text-method-delete",
};

export function MethodChip({
  method,
  className = "",
}: {
  method: string;
  className?: string;
}) {
  const upper = (method || "?").toUpperCase();
  const tone = TONES[upper] ?? "border-slate bg-graphite text-method-other";

  return (
    <span
      className={`inline-flex w-16 shrink-0 items-center justify-center rounded-[4px] border px-2 py-0.5 font-mono text-micro uppercase tracking-[0.05em] ${tone} ${className}`.trim()}
    >
      {upper}
    </span>
  );
}
