import Link from "next/link";
import { docsHref, docsNav, type DocHeading, type DocsNavItem } from "@/lib/docs";

/** Label seksi kecil — mono uppercase (dipakai sidebar & TOC). */
const labelClass = "font-mono text-micro uppercase tracking-[0.05em] text-smoke";

/** Sidebar dokumen — server component; item aktif dihitung dari slug halaman. */
export function DocsSidebar({ current }: { current: string }) {
  return (
    <nav className="space-y-7">
      {docsNav.map((section) => (
        <div key={section.title}>
          <div className={labelClass}>{section.title}</div>
          <ul className="mt-2.5 space-y-2">
            {section.items.map((item) => {
              const active = item.slug === current;
              return (
                <li key={item.slug || "index"}>
                  <Link
                    href={docsHref(item.slug)}
                    aria-current={active ? "page" : undefined}
                    className={`block text-body-sm transition-colors ${
                      active
                        ? "text-lightning-yellow"
                        : "text-ash hover:text-pure-white"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsToc({ headings }: { headings: DocHeading[] }) {
  return (
    <nav aria-label="Daftar isi">
      <div className={labelClass}>Di halaman ini</div>
      <ul className="mt-3 space-y-2 border-l border-graphite">
        {headings.map((heading, index) => (
          <li key={`${heading.id}-${index}`} className={heading.depth === 3 ? "pl-6" : "pl-3"}>
            <a
              href={`#${heading.id}`}
              className="-ml-px block border-l border-transparent text-body-sm text-ash transition-colors hover:border-electric-gold hover:text-pure-white"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DocsPager({
  prev,
  next,
}: {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
}) {
  if (!prev && !next) return null;

  const cardClass =
    "rounded-2xl border border-hairline bg-ink/40 p-4 transition-colors hover:border-iron";

  return (
    <nav className="mt-16 grid gap-3 border-t border-graphite pt-8 sm:grid-cols-2">
      {prev ? (
        <Link href={docsHref(prev.slug)} className={cardClass}>
          <div className={labelClass}>← Sebelumnya</div>
          <div className="mt-1 text-body-sm text-pure-white">{prev.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={docsHref(next.slug)} className={`${cardClass} sm:text-right`}>
          <div className={labelClass}>Selanjutnya →</div>
          <div className="mt-1 text-body-sm text-pure-white">{next.title}</div>
        </Link>
      ) : null}
    </nav>
  );
}
