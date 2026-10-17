import { site } from "@/lib/site";
import { InstallButton } from "@/components/InstallButton";

/** CTA penutup — atmosfer amber + strip meta jujur (versi & lisensi asli). */
export function BottomCta() {
  return (
    <section className="relative overflow-hidden py-24 text-center sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <div className="section-beam" />
        <div className="bg-tech-grid absolute inset-0 opacity-75" />
        <div className="hero-wash absolute left-1/2 top-[75%] h-[420px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" />
        <div className="hero-bar-1 absolute left-1/2 top-[65%] h-[110px] w-[620px] rounded-full opacity-55" />
        <div className="relative mx-auto h-full max-w-rail">
          <div className="rail-crosshair -left-[6px] -top-[5px]" />
          <div className="rail-crosshair -right-[6px] -top-[5px]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-page px-6">
        <h2 className="text-heading-lg font-normal text-pure-white sm:text-display">
          Siap mencoba di repo Express-mu?
        </h2>
        <p className="mx-auto mt-4 max-w-[460px] text-body text-ash">
          Instal secara global atau jalankan via npx, arahkan ke aplikasimu, dan
          bagikan laporan pertamamu dalam hitungan detik.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <InstallButton label="Quickstart — Copy npm install" />
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Lihat di GitHub
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 font-mono text-mono tracking-[0.017em] text-smoke">
          <span>$ {site.install}</span>
          <span aria-hidden="true" className="text-slate">
            |
          </span>
          <span>{site.license} License</span>
          <span aria-hidden="true" className="text-slate">
            |
          </span>
          <span>SonicPoint CLI v{site.version}</span>
        </div>
      </div>
    </section>
  );
}
