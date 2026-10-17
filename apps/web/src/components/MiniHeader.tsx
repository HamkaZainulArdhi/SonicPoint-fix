import Link from "next/link";
import { site } from "@/lib/site";

/** Header minimal untuk /docs & /report — nav kaca landing tidak ikut ke halaman ini. */
export function MiniHeader() {
  return (
    <header className="mx-auto flex max-w-page items-center justify-between gap-4 px-6 pb-6 pt-8">
      <Link href="/" className="inline-flex items-center">
        <img
          src="/icon.png"
          alt="SonicPoint"
          className="h-15 w-auto sm:h-16"
          decoding="async"
        />
      </Link>

      <nav
        aria-label="Navigasi halaman"
        className="flex items-center gap-4 text-code font-medium tracking-[0.008em] text-ash"
      >
        <a
          href={site.github}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-pure-white"
        >
          GitHub
        </a>
        <Link href="/" className="btn-ghost">
          Beranda
        </Link>
      </nav>
    </header>
  );
}
