import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Navigasi dokumentasi — SATU sumber urutan halaman.
 * Slug "" = /docs (index). File konten: src/content/docs/<slug>.mdx.
 * Kalau nav menunjuk file yang tidak ada, build gagal (readDoc melempar).
 */
export type DocsNavItem = { slug: string; title: string };
export type DocsNavSection = { title: string; items: DocsNavItem[] };

export const docsNav: DocsNavSection[] = [
  {
    title: "Mulai",
    items: [
      { slug: "", title: "Pendahuluan" },
      { slug: "instalasi", title: "Instalasi" },
      { slug: "quickstart", title: "Quickstart" },
    ],
  },
  {
    title: "Konsep",
    items: [
      { slug: "cara-kerja", title: "Cara kerja" },
      { slug: "fitur", title: "Fitur" },
    ],
  },
  {
    title: "Referensi CLI",
    items: [
      { slug: "scan", title: "scan" },
      { slug: "schema", title: "schema" },
      { slug: "init", title: "init" },
      { slug: "send", title: "send" },
      { slug: "report", title: "report" },
      { slug: "tui", title: "REPL interaktif" },
    ],
  },
  {
    title: "Lanjutan",
    items: [
      { slug: "konfigurasi", title: "Konfigurasi & provider" },
      { slug: "refs", title: "Referensi FK (refs)" },
      { slug: "self-hosting", title: "Self-hosting" },
    ],
  },
  {
    title: "Lainnya",
    items: [{ slug: "faq", title: "FAQ" }],
  },
];

export const docsFlat: DocsNavItem[] = docsNav.flatMap((section) => section.items);

const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

export type DocHeading = { id: string; text: string; depth: 2 | 3 };

export type Doc = {
  slug: string;
  title: string;
  description: string;
  body: string;
  headings: DocHeading[];
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
};

/**
 * Slug anchor — dipakai DUA sisi: komponen heading di `components/mdx.tsx`
 * dan ekstraksi TOC di bawah. Jangan ubah salah satu tanpa yang lain.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function docsHref(slug: string): string {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

function extractHeadings(body: string): DocHeading[] {
  const headings: DocHeading[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    headings.push({
      id: slugify(match[2]),
      text: match[2].replace(/`/g, ""),
      depth: match[1].length as 2 | 3,
    });
  }

  return headings;
}

export function readDoc(slug: string): Doc | null {
  const index = docsFlat.findIndex((item) => item.slug === slug);
  if (index === -1) return null;

  const file = path.join(DOCS_DIR, slug === "" ? "index.mdx" : `${slug}.mdx`);
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : docsFlat[index].title,
    description: typeof data.description === "string" ? data.description : "",
    body: content,
    headings: extractHeadings(content),
    prev: index > 0 ? docsFlat[index - 1] : null,
    next: index < docsFlat.length - 1 ? docsFlat[index + 1] : null,
  };
}
