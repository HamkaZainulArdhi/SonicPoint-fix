import Link from "next/link";
import { site } from "@/lib/site";
import { BoltMark } from "./BoltMark";

const links = [
  { label: "Dokumentasi", href: "/docs" },
  { label: "Quickstart", href: "/docs/quickstart" },
  { label: "GitHub", href: site.github, external: true },
  { label: "npm", href: site.npm, external: true },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-charcoal">
      <div className="mx-auto flex max-w-page flex-col gap-10 px-6 py-12 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 text-snow">
            <BoltMark className="size-4 text-lightning-yellow" />
            <span className="font-mono text-body-sm font-medium">sonic-point</span>
          </div>
          <p className="mt-3 text-body-sm text-smoke">
            Scanner endpoint Express.js — temukan lewat AST, uji dengan payload
            dari schema validasimu, lalu bagikan laporan lewat satu link.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-16 gap-y-3 text-body-sm text-silver-mist">
          {links.map((link) =>
            "external" in link ? (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-snow">
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-snow">
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <div className="border-t border-charcoal">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-6 py-4 text-caption text-graphite sm:flex-row sm:items-center sm:justify-between">
          <span>Dokumentasi berbahasa Indonesia. Proyek sumber terbuka.</span>
          <span className="font-mono">$ {site.install}</span>
        </div>
      </div>
    </footer>
  );
}
