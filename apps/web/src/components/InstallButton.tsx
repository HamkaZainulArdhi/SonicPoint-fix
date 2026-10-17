"use client";

import { site } from "@/lib/site";
import { useCopy } from "@/lib/use-copy";
import { IconPackage } from "./icons";

/** Tombol salin perintah instalasi — dipakai di CTA bawah (bukan navbar lagi). */
export function InstallButton({
  label = "Install Package",
  doneLabel = "Tersalin!",
  className = "",
  icon = true,
}: {
  label?: string;
  doneLabel?: string;
  className?: string;
  icon?: boolean;
}) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => void copy(site.install)}
      aria-label={`Salin perintah instalasi: ${site.install}`}
      className={`btn-primary ${className}`.trim()}
    >
      {icon ? <IconPackage className="size-3.5 text-void-black" /> : null}
      <span>{copied ? doneLabel : label}</span>
    </button>
  );
}
