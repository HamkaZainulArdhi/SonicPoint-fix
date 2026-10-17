import Link from "next/link";
import { site } from "@/lib/site";
import { BoltMark } from "./BoltMark";
import { pill } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-charcoal bg-obsidian/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-page items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2.5 text-snow">
          <BoltMark className="size-5 text-lightning-yellow" />
          <span className="font-mono text-body-sm font-medium">sonic-point</span>
        </Link>

        <nav className="flex items-center gap-5 text-body-sm text-silver-mist sm:gap-6">
          <Link href="/docs" className="transition-colors hover:text-snow">
            Dokumentasi
          </Link>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="hidden transition-colors hover:text-snow sm:inline"
          >
            GitHub
          </a>
        </nav>

        <Link href="/docs/quickstart" className={`${pill("primary", "sm")} ml-auto`}>
          Quickstart
        </Link>
      </div>
    </header>
  );
}
