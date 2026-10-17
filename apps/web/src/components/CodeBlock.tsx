"use client";

import { useRef, type ReactNode } from "react";
import { useCopy } from "@/lib/use-copy";

type Props = {
  /** Konten MDX (`<pre>` dari fenced code block). */
  children?: ReactNode;
  /** Alternatif string mentah (dipakai report viewer). */
  code?: string;
  className?: string;
};

/**
 * Blok kode/terminal — well gelap + tombol salin.
 * Tanpa syntax highlight (sengaja): mono + border, sesuai DESIGN.md.
 */
export function CodeBlock({ children, code, className = "" }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const { copied, copy } = useCopy();

  async function handleCopy() {
    const text = code ?? preRef.current?.innerText ?? "";
    await copy(text);
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-graphite bg-ink ${className || "mt-6"}`}
    >
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="absolute right-2.5 top-2.5 z-10 rounded-[6px] border border-slate bg-obsidian/90 px-2 py-1 font-mono text-micro uppercase tracking-[0.05em] text-ash transition-colors hover:border-iron hover:text-pure-white"
      >
        {copied ? "Tersalin" : "Salin"}
      </button>
      <pre
        ref={preRef}
        className="overflow-x-auto p-3.5 pr-20 font-mono text-code leading-[1.65] text-mist [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      >
        {code ?? children}
      </pre>
    </div>
  );
}
