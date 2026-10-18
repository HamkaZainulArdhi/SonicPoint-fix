import { metrics } from "@/lib/landing";
import { MetricCard } from "@/components/ui";
import { PkgSwitcher } from "./PkgSwitcher";
import Lightning from "../lighting-bg";

/** Hero — atmosfer amber (lightning canvas), klaim metrik jujur. */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline/60 pb-16 pt-28 sm:pb-24 sm:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="bg-tech-grid absolute inset-0 opacity-90" />
        <div className="relative h-[600px] w-full">
          <Lightning
            color="#FFE600"
            bolts={1}
            spread={0.6}
            branches={0.5}
            xOffset={0}
            angle={0}
            size={2}
            thickness={1}
            glow={1.15}
            intensity={1.1}
            speed={1}
            flicker={0.6}
            mouseInteraction={false}
            clickStrike={false}
            intro
            fade={0}
            opacity={0.55}
            lightMode={false}
            className="hero-lightning"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <div className="relative mx-auto max-w-page px-6 text-center">
        <h1 className="mx-auto max-w-[820px] text-heading-lg font-normal text-pure-white sm:text-display">
          Semua endpoint Express-mu,
          <br />
          scan — uji — bagikan.
        </h1>

        <p className="mx-auto mt-6 max-w-[540px] text-body text-ash">
          SonicPoint membaca router langsung dari AST, menyusun
          payload dari schema validasi, menyampel ID relasi asli dari API-mu,
          lalu menerbitkan dokumentasi API lewat satu link.
        </p>

        <PkgSwitcher />

        <div className="mx-auto mt-10 grid max-w-[960px] grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
