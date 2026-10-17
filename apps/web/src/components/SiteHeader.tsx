"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/lib/landing";
import { site } from "@/lib/site";
import { IconPackage } from "./icons";

const docsLinks = [
  { href: "/docs/quickstart", label: "Quickstart" },
  { href: "/docs/faq", label: "FAQ" },
];

/** Halaman yang punya header sendiri (`MiniHeader`) — nav kaca tidak ikut ke sana. */
const ownHeader = ["/docs", "/report"];

/** Tinggi offset nav mengapung; dipakai juga oleh `scroll-mt` section landing. */
const NAV_OFFSET = 96;

/**
 * Section landing yang sedang menempati area baca (di bawah nav) → item aktif.
 * Satu IntersectionObserver, tanpa listener scroll.
 */
function useActiveSection(enabled: boolean) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActiveId(null);
      return;
    }

    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const seen = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry);
        // Section pertama (urutan dokumen) yang menyentuh area baca = yang aktif.
        const current = sections.find((el) => seen.get(el.id)?.isIntersecting);
        setActiveId(current?.id ?? null);
      },
      { rootMargin: `-${NAV_OFFSET}px 0px -55% 0px` },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return activeId;
}

/** Nav kaca mengapung untuk landing (docs & report memakai `MiniHeader`). */
export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const activeId = useActiveSection(isLanding);

  if (ownHeader.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6">
      <nav
        aria-label="Navigasi utama"
        className="glass-nav mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-2"
      >
        <Link href="/" className="inline-flex items-center">
          <img
            src="/icon.png"
            alt="SonicPoint"
            className="h-10 w-auto sm:h-10"
            decoding="async"
          />
        </Link>

        <div className="hidden items-center gap-5 text-code font-medium tracking-[0.008em] text-ash lg:flex">
          {isLanding
            ? navLinks.map((link) => {
                const active = activeId === link.href.slice(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "location" : undefined}
                    className={`relative py-1 transition-colors ${
                      active ? "text-pure-white" : "hover:text-pure-white"
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 -bottom-px h-px bg-amber-depth transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </a>
                );
              })
            : docsLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-pure-white"
                >
                  {link.label}
                </Link>
              ))}
          {!isLanding ? (
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-pure-white"
            >
              GitHub
            </a>
          ) : null}
        </div>

        <Link href="/docs" className="btn-primary">
          <IconPackage className="size-3.5 text-void-black" />
          <span>Dokumentasi</span>
        </Link>
      </nav>
    </header>
  );
}
