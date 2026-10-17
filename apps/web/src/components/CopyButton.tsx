"use client";

import { useState } from "react";

/** Tombol salin kecil — dipakai di install box & kartu session report. */
export function CopyButton({
  value,
  label = "Salin",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard tidak tersedia (http / izin browser) — tidak ada efek.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-full border border-slate px-2.5 py-1 text-caption text-silver-mist transition-colors hover:border-graphite hover:text-snow ${className}`}
    >
      {copied ? "Tersalin" : label}
    </button>
  );
}
