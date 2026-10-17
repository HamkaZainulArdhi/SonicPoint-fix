"use client";

import { useCopy } from "@/lib/use-copy";

/** Tombol salin kecil — dipakai di kartu session report. */
export function CopyButton({
  value,
  label = "Salin",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      className={`rounded-[6px] border border-slate px-2 py-1 font-mono text-micro uppercase tracking-[0.05em] text-ash transition-colors hover:border-iron hover:text-pure-white ${className}`.trim()}
    >
      {copied ? "Tersalin" : label}
    </button>
  );
}
