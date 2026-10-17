"use client";

import Link from "next/link";
import { useState } from "react";
import { faqItems, limitations } from "@/lib/landing";
import { site } from "@/lib/site";
import { Segs } from "@/components/Segs";
import { Section } from "@/components/ui";

/** FAQ accordion + kartu batasan yang diakui (jujur, selaras dengan perilaku CLI). */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section
      id="faq"
      sec="SEC // 07 · TRANSPARENCY_FAQ"
      eyebrow="Transparency & Docs"
      title="Pertanyaan umum & batasan yang kami akui."
      description="Developer tool harus jujur soal apa yang sudah berjalan baik dan batasan arsitektur saat ini."
      bg="dots"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate bg-obsidian p-4">
            <div className="font-mono text-tiny uppercase tracking-[0.05em] text-electric-gold">
              Batasan saat ini (v{site.version})
            </div>
            <ul className="mt-2.5 space-y-2 text-body-sm text-ash">
              {limitations.map((line, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden="true" className="text-smoke">
                    •
                  </span>
                  <span>
                    <Segs segs={line} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 font-mono text-tiny text-smoke">
            Selengkapnya di{" "}
            <Link
              href="/docs/faq"
              className="text-electric-gold underline-offset-4 transition-colors hover:text-lightning-yellow hover:underline"
            >
              /docs/faq
            </Link>
            .
          </p>
        </div>

        <div className="space-y-2.5 lg:col-span-7">
          {faqItems.map((item, index) => {
            const isOpen = open === index;

            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-xl border border-hairline bg-ink"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-obsidian"
                >
                  <span className="text-body font-medium text-pure-white">
                    {item.q}
                  </span>
                  <span aria-hidden="true" className="font-mono text-body text-ash">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p className="border-t border-graphite px-5 pb-4 pt-3 text-body-sm text-ash">
                    <Segs segs={item.a} />
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
