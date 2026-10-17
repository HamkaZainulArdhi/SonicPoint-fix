"use client";

import { useRef, useState, type ReactNode } from "react";

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
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = code ?? preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard tidak tersedia — diamkan
    }
  }

  return (
    <div className={`group relative overflow-hidden rounded-lg border border-charcoal bg-ink ${className ?? "mt-6"}`}>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2.5 top-2.5 z-10 rounded-full border border-slate bg-ink/90 px-2.5 py-1 text-caption text-smoke transition-colors hover:border-graphite hover:text-snow"
      >
        {copied ? "Tersalin" : "Salin"}
      </button>
      <pre
        ref={preRef}
        className="overflow-x-auto p-4 pr-20 font-mono text-code text-silver-mist [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      >
        {code ?? children}
      </pre>
    </div>
  );
}
