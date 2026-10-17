import Link from "next/link";
import { docsHref, docsNav, type DocHeading, type DocsNavItem } from "@/lib/docs";

/** Sidebar dokumen — server component; item aktif dihitung dari slug halaman. */
export function DocsSidebar({ current }: { current: string }) {
  return (
    <nav className="space-y-7">
      {docsNav.map((section) => (
        <div key={section.title}>
          <div className="text-caption uppercase text-graphite">{section.title}</div>
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
                        : "text-silver-mist hover:text-snow"
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
      <div className="text-caption uppercase text-graphite">Di halaman ini</div>
      <ul className="mt-3 space-y-2 border-l border-charcoal">
        {headings.map((heading, index) => (
          <li key={`${heading.id}-${index}`} className={heading.depth === 3 ? "pl-6" : "pl-3"}>
            <a
              href={`#${heading.id}`}
              className="-ml-px block border-l border-transparent text-body-sm text-smoke transition-colors hover:border-graphite hover:text-snow"
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

  return (
    <nav className="mt-16 grid gap-3 border-t border-charcoal pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={docsHref(prev.slug)}
          className="rounded-2xl border border-charcoal p-4 transition-colors hover:border-slate"
        >
          <div className="text-caption text-smoke">← Sebelumnya</div>
          <div className="mt-1 text-body-sm text-snow">{prev.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={docsHref(next.slug)}
          className="rounded-2xl border border-charcoal p-4 transition-colors hover:border-slate sm:text-right"
        >
          <div className="text-caption text-smoke">Selanjutnya →</div>
          <div className="mt-1 text-body-sm text-snow">{next.title}</div>
        </Link>
      ) : null}
    </nav>
  );
}
