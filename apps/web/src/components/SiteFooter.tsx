import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./ui";

const links = [
  { label: "Dokumentasi", href: "/docs" },
  { label: "Quickstart", href: "/docs/quickstart" },
  { label: "GitHub", href: site.github, external: true },
  { label: "npm", href: site.npm, external: true },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative border-t border-hairline/60 py-8">
      <div className="mx-auto flex max-w-page flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-2 text-code font-medium text-ash">
          <LogoMark />
          <span className="text-pure-white">{site.name}</span>
          <span className="text-smoke">— Express AST API Tester</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-body-sm text-ash">
          {links.map((link) =>
            "external" in link ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-pure-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-pure-white"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="font-mono text-tiny text-smoke">
          v{site.version} <span className="mx-1.5 text-slate">|</span> Express.js ·
          Joi · Zod · Yup
        </div>
      </div>
    </footer>
  );
}
