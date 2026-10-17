import type { ReactNode } from "react";
import type { Metric } from "@/lib/landing";

/**
 * Primitives presentational (semua server-safe, tanpa hook).
 * Kelas visual kompleks hidup di `globals.css` (@layer components) supaya
 * JSX tetap tipis dan konsisten lintas halaman.
 */

/** Kelas tombol — `.btn-primary` / `.btn-ghost` didefinisikan di globals.css. */
export function btn(variant: "primary" | "ghost", className = ""): string {
  return `${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`.trim();
}

/** Diamond amber ber-glow — logo SonicPoint. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex size-4 shrink-0 items-center justify-center ${className}`}
    >
      <span className="size-2.5 rotate-45 rounded-[2px] bg-lightning-yellow shadow-[0_0_12px_rgba(255,230,0,0.65)]" />
    </span>
  );
}

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: "neutral" | "amber" | "gold";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "badge",
    amber: "badge badge-amber",
    gold: "badge badge-gold",
  } as const;

  return <span className={`${tones[tone]} ${className}`.trim()}>{children}</span>;
}

export function Kbd({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <kbd className={`kbd ${className}`.trim()}>{children}</kbd>;
}

export function IconOrb({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`icon-orb ${className}`.trim()}>{children}</div>;
}

export function WindowFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`window-frame ${className}`.trim()}>{children}</div>;
}


/** Kartu metrik hero — angka jujur, bukan benchmark rekaan. */
export function MetricCard({ label, value, tone, hint }: Metric) {
  return (
    <div className="rounded-xl border border-slate bg-ink/80 p-4 shadow-edge">
      <div className="font-mono text-micro uppercase tracking-[0.06em] text-smoke">
        {label}
      </div>
      <div
        className={`mt-1.5 text-heading-sm font-medium tabular-nums ${
          tone === "amber" ? "text-lightning-yellow" : "text-pure-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-mono text-ash">{hint}</div>
    </div>
  );
}

/** Rail struktural global (fixed) — dipasang sekali di layout. */
export function Rails() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex justify-center overflow-hidden"
    >
      <div className="relative h-full w-full max-w-rail border-x border-graphite/75">
        <div className="absolute inset-y-0 left-1/3 hidden w-px bg-gradient-to-b from-transparent via-graphite/30 to-transparent lg:block" />
        <div className="absolute inset-y-0 left-2/3 hidden w-px bg-gradient-to-b from-transparent via-graphite/30 to-transparent lg:block" />
      </div>
    </div>
  );
}

type SectionProps = {
  id?: string;
  /** Label arsitektural sudut kiri-atas, mis. "SEC // 01 · REPL_WORKBENCH". */
  sec: string;
  eyebrow: string;
  eyebrowTone?: "amber" | "gold" | "muted";
  title: ReactNode;
  description?: ReactNode;
  /** Slot kanan: switcher, hint kbd, filter pill, dll. */
  aside?: ReactNode;
  bg?: "grid" | "dots" | "plain";
  /** Div atmosfer kustom (position absolute, sudah di dalam overflow-hidden). */
  glow?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Shell section — satu tempat untuk rail, crosshair, beam, latar grid/dots,
 * tag SEC, dan ritme heading. Semua section landing memakai ini.
 */
export function Section({
  id,
  sec,
  eyebrow,
  eyebrowTone = "muted",
  title,
  description,
  aside,
  bg = "plain",
  glow,
  children,
  className = "",
}: SectionProps) {
  const eyebrowClass =
    eyebrowTone === "amber"
      ? "text-lightning-yellow"
      : eyebrowTone === "gold"
        ? "text-electric-gold"
        : "text-smoke";

  return (
    <section
      id={id}
      className={`scroll-mt-[72px] relative overflow-hidden border-b border-hairline/60 py-20 sm:py-28 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <div className="section-beam" />
        {bg === "grid" ? (
          <div className="bg-tech-grid absolute inset-0 opacity-60" />
        ) : null}
        {bg === "dots" ? (
          <div className="bg-dot-matrix absolute inset-0 opacity-75" />
        ) : null}
        {glow}
        <div className="relative mx-auto h-full max-w-rail">
          <div className="rail-crosshair -left-[6px] -top-[5px]" />
          <div className="rail-crosshair -right-[6px] -top-[5px]" />
          <div className="absolute left-5 top-[18px] hidden font-mono text-micro uppercase tracking-[0.12em] text-hairline xl:block">
            {sec}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-page px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className={`eyebrow ${eyebrowClass}`}>{eyebrow}</p>
            <h2 className="mt-4 text-heading font-normal text-pure-white">
              {title}
            </h2>
            {description ? (
              <div className="mt-3.5 text-body text-ash">{description}</div>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>

        {children ? <div className="mt-12">{children}</div> : null}
      </div>
    </section>
  );
}
