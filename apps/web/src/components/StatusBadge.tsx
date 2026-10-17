import { isSkippedStatus } from "@/lib/format";

type Props = { success: boolean; statusCode: number | string | null };

function Chip({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 font-mono text-caption ${tone}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ success, statusCode }: Props) {
  // Skip ditulis CLI sebagai string "SKIPPED" — bukan kegagalan merah.
  if (isSkippedStatus(statusCode)) {
    return <Chip tone="border-charcoal bg-ash text-smoke" label="SKIPPED" />;
  }

  if (statusCode === null || statusCode === undefined || statusCode === "") {
    return <Chip tone="border-charcoal bg-ash text-smoke" label="—" />;
  }

  return success ? (
    <Chip tone="border-ok/40 bg-ok/10 text-ok" label={`✓ ${statusCode}`} />
  ) : (
    <Chip tone="border-err/40 bg-err/10 text-err" label={`✗ ${statusCode}`} />
  );
}
