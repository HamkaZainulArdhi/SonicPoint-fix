import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { DocsPager, DocsSidebar, DocsToc } from "@/components/DocsChrome";
import { mdxComponents } from "@/components/mdx";
import { docsFlat, readDoc } from "@/lib/docs";

type Params = { slug?: string[] };

// Hanya slug yang diketahui (docsNav) yang di-render — sisanya 404 statis.
export const dynamicParams = false;

export function generateStaticParams() {
  return docsFlat.map((item) => ({
    slug: item.slug === "" ? [] : item.slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = readDoc((slug ?? []).join("/"));
  if (!doc) return {};

  return { title: doc.title, description: doc.description || undefined };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const doc = readDoc((slug ?? []).join("/"));
  if (!doc) notFound();

  return (
    <div className="mx-auto flex max-w-page gap-10 px-6">
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-10 pr-2">
          <DocsSidebar current={doc.slug} />
        </div>
      </aside>

      <div className="min-w-0 flex-1 py-10">
        <details className="rounded-lg border border-charcoal px-4 py-3 lg:hidden">
          <summary className="cursor-pointer select-none text-body-sm text-silver-mist">
            Navigasi dokumentasi
          </summary>
          <div className="mt-5">
            <DocsSidebar current={doc.slug} />
          </div>
        </details>

        <article className="mt-10 max-w-prose lg:mt-0">
          <h1 className="text-heading font-normal text-snow">{doc.title}</h1>
          {doc.description ? (
            <p className="mt-3 text-subheading text-silver-mist">
              {doc.description}
            </p>
          ) : null}

          <MDXRemote
            source={doc.body}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </article>

        <div className="max-w-prose">
          <DocsPager prev={doc.prev} next={doc.next} />
        </div>
      </div>

      {doc.headings.length > 0 ? (
        <aside className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-10">
            <DocsToc headings={doc.headings} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
