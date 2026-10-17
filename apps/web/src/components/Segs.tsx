import type { Line, Tone } from "@/lib/landing";

const toneClass: Record<Tone, string> = {
  white: "text-pure-white",
  mist: "text-mist",
  dim: "text-smoke",
  smoke: "text-smoke",
  amber: "text-lightning-yellow",
  gold: "text-electric-gold",
  ok: "text-ok",
  err: "text-err",
  warn: "text-warn",
};

/** Renderer segmen teks (terminal, FAQ, tabel) — pewarnaan ikut data, bukan HTML string. */
export function Segs({ segs, className = "" }: { segs: Line; className?: string }) {
  return (
    <span className={className}>
      {segs.map((seg, index) => {
        const classes = [seg.tone ? toneClass[seg.tone] : "", seg.code ? "font-mono text-mono" : ""]
          .filter(Boolean)
          .join(" ");

        return (
          <span key={index} className={classes || undefined}>
            {seg.text}
          </span>
        );
      })}
    </span>
  );
}
