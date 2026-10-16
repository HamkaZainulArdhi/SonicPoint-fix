type Props = { success: boolean; statusCode: number | string | null };

export function StatusBadge({ success, statusCode }: Props) {
  const label = statusCode === null ? "—" : String(statusCode);
  const color = success
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {success ? "✓" : "✗"} {label}
    </span>
  );
}
