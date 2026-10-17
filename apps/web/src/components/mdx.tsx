import Link from "next/link";
import type { ReactNode } from "react";
import { slugify } from "@/lib/docs";
import { Callout } from "./Callout";
import { CodeBlock } from "./CodeBlock";

/**
 * Mapping elemen MDX → gaya DESIGN.md. Anchor heading memakai `slugify`
 * yang sama dengan ekstraksi TOC (`lib/docs.ts`) — jangan diubah sepihak.
 */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

const linkClass =
  "text-electric-gold underline-offset-4 transition-colors hover:text-lightning-yellow hover:underline";

const listClass = "mt-5 space-y-2 pl-5 text-body text-silver-mist marker:text-graphite";

export const mdxComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-14 scroll-mt-24 text-heading font-normal text-snow first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2
      id={slugify(textOf(children))}
      className="mt-14 scroll-mt-24 text-heading-sm font-medium text-snow first:mt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3
      id={slugify(textOf(children))}
      className="mt-10 scroll-mt-24 text-subheading font-medium text-snow"
    >
      {children}
    </h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-5 text-body text-silver-mist">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className={`${listClass} list-disc`}>{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className={`${listClass} list-decimal`}>{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="[&>p]:m-0">{children}</li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-6 border-l-2 border-amber-depth/60 pl-4 text-body-sm text-silver-mist [&>p]:mt-0 [&>p]:text-body-sm">
      {children}
    </blockquote>
  ),
  a: ({ href = "", children }: { href?: string; children?: ReactNode }) =>
    href.startsWith("/") ? (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
        {children}
      </a>
    ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <code
      className={`rounded-md border border-charcoal bg-ash px-1.5 py-0.5 font-mono text-code text-snow ${className ?? ""}`}
    >
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <CodeBlock>{children}</CodeBlock>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-6 overflow-x-auto rounded-lg border border-charcoal">
      <table className="w-full border-collapse text-body-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-ash/40 text-caption text-silver-mist">{children}</thead>
  ),
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className="border-b border-charcoal last:border-0">{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-4 py-2.5 align-top">{children}</td>
  ),
  hr: () => <hr className="mt-10 border-charcoal" />,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-medium text-snow">{children}</strong>
  ),
  Callout,
};
