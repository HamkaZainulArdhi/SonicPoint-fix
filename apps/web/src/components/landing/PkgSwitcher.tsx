"use client";

import { useState } from "react";
import { pkgManagers } from "@/lib/landing";
import { useCopy } from "@/lib/use-copy";
import { IconCopy } from "@/components/icons";

/** Switcher package manager + well perintah instalasi (bagian interaktif hero). */
export function PkgSwitcher() {
  const [key, setKey] = useState(pkgManagers[0].key);
  const { copied, copy } = useCopy();
  const active = pkgManagers.find((pkg) => pkg.key === key) ?? pkgManagers[0];

  return (
    <div className="mx-auto mt-7 max-w-[460px]">
      <div className="mb-5 flex items-center justify-center gap-1">
        {pkgManagers.map((pkg) => (
          <button
            key={pkg.key}
            type="button"
            onClick={() => setKey(pkg.key)}
            className={`rounded-[5px] border px-2 py-0.5 font-mono text-tiny transition-colors ${
              pkg.key === key
                ? "border-hairline bg-graphite text-pure-white"
                : "border-transparent text-smoke hover:text-pure-white"
            }`}
          >
            {pkg.label}
          </button>
        ))}
      </div>

      <div className="input-well flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-code">
          <span className="select-none text-lightning-yellow">$</span>
          <code className="truncate text-pure-white">{active.cmd}</code>
        </div>
        <button
          type="button"
          onClick={() => void copy(active.cmd)}
          aria-label="Salin perintah instalasi"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-graphite px-2 py-1 font-mono text-tiny text-ash transition-colors hover:bg-slate hover:text-pure-white"
        >
          <IconCopy className="size-3.5" />
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
