import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { TerminalDemo } from "@/components/TerminalDemo";
import { card, pill } from "@/components/ui";
import { site } from "@/lib/site";

/* ── Ikon garis (1.5px, tanpa isi) — bahasa visual diagram teknis ───────── */

type IconProps = { className?: string };

function IconBase({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const icons = {
  scan: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M8 12h8M8 9h5" />
    </IconBase>
  ),
  schema: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </IconBase>
  ),
  link: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
    </IconBase>
  ),
  key: (props: IconProps) => (
    <IconBase {...props}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="m10.5 12.5 7-7M15 5.5 17.5 8M17.5 3 20 5.5" />
    </IconBase>
  ),
  terminal: (props: IconProps) => (
    <IconBase {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 9.5 3 2.5-3 2.5M13 15h4" />
    </IconBase>
  ),
  share: (props: IconProps) => (
    <IconBase {...props}>
      <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
      <path d="M12 3v11M8 6.5 12 3l4 3.5" />
    </IconBase>
  ),
} as const;

/* ── Konten ─────────────────────────────────────────────────────────────── */

const features = [
  {
    icon: icons.scan,
    title: "Scan dari AST",
    body: "Endpoint ditemukan dari kode: mount prefix diikuti, import relatif di-resolve, dan import melingkar tidak membuat scanner tersesat.",
  },
  {
    icon: icons.schema,
    title: "Payload dari schema validasimu",
    body: "Joi, Zod, dan Yup dipindai menjadi field required/optional beserta constraint. AI mengisi payloadnya; tanpa AI, fallback deterministik tetap jalan.",
  },
  {
    icon: icons.link,
    title: "Relasi yang tidak dikarang",
    body: "itemId dan lahanId disampel dari collection GET milikmu, di-cache sekali, lalu di-refresh otomatis saat terbukti basi. Nol data palsu.",
  },
  {
    icon: icons.key,
    title: "Auth-aware",
    body: "Login sekali lewat login endpoint, token diambil dari tokenField, lalu dipakai sebagai Bearer di semua request — termasuk saat sampling.",
  },
  {
    icon: icons.terminal,
    title: "Satu prompt untuk semuanya",
    body: "/scan, /schema, /context, /test, /report, dan /config bekerja tanpa keluar dari REPL — memakai engine yang sama dengan command mode.",
  },
  {
    icon: icons.share,
    title: "Laporan yang jujur",
    body: "Request body, respons, status, dan latensi per endpoint dalam satu halaman ala Swagger. Yang gagal ditulis gagal, yang di-skip menyebut alasannya.",
  },
] as const;

const steps = [
  {
    title: "Arahkan",
    body: "Satu kali init: base URL, login endpoint, dan kredensial uji. Tersimpan lokal di .sonic-point.json.",
    cmd: "sonic-point init",
  },
  {
    title: "Scan & uji",
    body: "Temukan semua endpoint beserta schema-nya, lalu uji dengan payload yang benar-benar mengikuti kontrak API-mu.",
    cmd: "sonic-point send",
  },
  {
    title: "Bagikan",
    body: "Terbitkan hasil uji terakhir dan dapatkan satu link publik berisi seluruh detail sesi.",
    cmd: "sonic-point report",
  },
] as const;

/* ── Halaman ────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-charcoal">
        <div className="mx-auto max-w-page px-6 pb-24 pt-24 text-center sm:pb-32 sm:pt-32">
          <p className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-charcoal bg-ash px-4 py-1.5 text-caption text-silver-mist">
            <span className="size-1.5 rounded-full bg-lightning-yellow" />
            Untuk Express.js dengan Joi, Zod, atau Yup
          </p>

          <h1 className="mx-auto mt-8 max-w-3xl text-heading font-normal text-snow sm:text-display">
            Semua endpoint Express-mu,
            <br />
            <span className="text-lightning-yellow">scan — uji — bagikan.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-body text-silver-mist">
            SonicPoint membaca router Express-mu, menyusun payload dari schema
            validasi, menyampel id relasi dari API-mu sendiri, lalu menerbitkan
            laporan yang bisa dibuka lewat satu link.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/quickstart" className={pill("primary")}>
              Mulai — Quickstart
            </Link>
            <Link href="/docs" className={pill("ghost")}>
              Baca dokumentasi
            </Link>
          </div>

          <div className="mx-auto mt-12 flex max-w-md items-center justify-between gap-4 rounded-full border border-charcoal bg-ink py-2 pl-5 pr-2">
            <code className="truncate font-mono text-body-sm text-silver-mist">
              $ {site.install}
            </code>
            <CopyButton value={site.install} />
          </div>
        </div>
      </section>

      <section className="border-b border-charcoal">
        <div className="mx-auto max-w-page px-6 py-20">
          <TerminalDemo />
          <p className="mx-auto mt-5 max-w-3xl text-center text-caption text-smoke">
            Output asli CLI: scan, uji satu endpoint, lalu terbitkan laporan.
          </p>
        </div>
      </section>

      <section className="border-b border-charcoal">
        <div className="mx-auto max-w-page px-6 py-20 sm:py-24">
          <h2 className="text-heading-sm font-medium text-snow">
            Dibangun untuk alur kerja yang nyata.
          </h2>
          <p className="mt-3 max-w-2xl text-body text-silver-mist">
            Bukan sekadar hit endpoint: SonicPoint memahami kode, schema, dan
            data milikmu — lalu melaporkan apa adanya.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className={`${card} p-6`}>
                <feature.icon className="size-6 text-electric-gold" />
                <h3 className="mt-5 text-subheading font-medium text-snow">
                  {feature.title}
                </h3>
                <p className="mt-2 text-body-sm text-silver-mist">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-charcoal">
        <div className="mx-auto max-w-page px-6 py-20 sm:py-24">
          <h2 className="text-heading-sm font-medium text-snow">
            Dari nol sampai link laporan.
          </h2>

          <div className="mt-12 grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <div key={step.title}>
                <div className="font-mono text-caption text-amber-depth">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-subheading font-medium text-snow">
                  {step.title}
                </h3>
                <p className="mt-2 text-body-sm text-silver-mist">{step.body}</p>
                <div className="mt-5 inline-flex rounded-lg border border-charcoal bg-ink px-3 py-1.5 font-mono text-code text-silver-mist">
                  $ {step.cmd}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-14 text-caption text-smoke">
            Batasan yang kami akui: saat ini fokus Express.js dengan import
            relatif.{" "}
            <Link
              href="/docs/faq"
              className="text-electric-gold underline-offset-4 hover:text-lightning-yellow hover:underline"
            >
              Baca selengkapnya di FAQ
            </Link>
            .
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-page px-6 py-24 text-center">
          <h2 className="text-heading font-normal text-snow">
            Siap mencoba?
          </h2>
          <p className="mt-3 text-body text-silver-mist">
            Instal, arahkan ke aplikasimu, dan bagikan laporan pertamamu.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/quickstart" className={pill("primary")}>
              Quickstart
            </Link>
            <a href={site.github} target="_blank" rel="noreferrer" className={pill("ghost")}>
              Lihat di GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
