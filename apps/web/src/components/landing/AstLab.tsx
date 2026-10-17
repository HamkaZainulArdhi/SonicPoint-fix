"use client";

import { useState } from "react";
import {
  labLabels,
  validatorKeys,
  validatorLab,
  type ValidatorKey,
} from "@/lib/landing";
import { Section } from "@/components/ui";

/**
 * Lab transpiler 3 panel: kode sumber → kontrak AST → payload tersintesis.
 * Switcher validator (Zod/Joi/Yup) mengubah isi ketiga panel sekaligus.
 */
export function AstLab() {
  const [key, setKey] = useState<ValidatorKey>("zod");
  const data = validatorLab[key];

  return (
    <Section
      id="ast-lab"
      sec="SEC // 02 · AST_TRANSPILER_LAB"
      eyebrow="Deep-Dive: Schema-to-Payload Engine"
      eyebrowTone="amber"
      title="Lihat bagaimana SonicPoint membaca kode Express-mu."
      description="Tanpa anotasi JSDoc tambahan atau dekorator khusus. Pilih library validasi yang kamu gunakan untuk melihat bagaimana AST walker mengekstrak aturan dan menyusun payload siap kirim."
      bg="grid"
      aside={
        <div className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate bg-obsidian p-1.5">
          {validatorKeys.map((validator) => (
            <button
              key={validator}
              type="button"
              onClick={() => setKey(validator)}
              className={`rounded-md px-3 py-1.5 font-mono text-mono font-medium transition-colors ${
                validator === key
                  ? "bg-mist text-void-black"
                  : "text-ash hover:text-pure-white"
              }`}
            >
              {labLabels[validator]}
            </button>
          ))}
        </div>
      }
      glow={
        <>
          <div className="absolute right-[12%] top-[55%] h-[300px] w-[460px] -translate-y-1/2 rounded-full bg-lightning-yellow/[0.06] blur-[90px]" />
          <svg
            className="absolute right-[4%] top-[12%] hidden h-[180px] w-[420px] text-pure-white/[0.035] lg:block"
            viewBox="0 0 420 180"
            fill="none"
          >
            <path
              d="M20 40 H140 L180 80 H310"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path d="M140 40 L180 140 H280" stroke="currentColor" strokeWidth="1" />
            <circle cx="20" cy="40" r="4" fill="currentColor" />
            <circle cx="140" cy="40" r="4" fill="currentColor" />
            <circle cx="180" cy="80" r="4" fill="currentColor" />
            <circle cx="310" cy="80" r="4" fill="currentColor" />
            <circle cx="180" cy="140" r="4" fill="currentColor" />
            <circle cx="280" cy="140" r="4" fill="currentColor" />
            <text
              x="190"
              y="72"
              fill="currentColor"
              fontFamily="monospace"
              fontSize="9"
            >
              AST::CallExpression(router.post)
            </text>
            <text
              x="190"
              y="132"
              fill="currentColor"
              fontFamily="monospace"
              fontSize="9"
            >
              Schema::ValidatorMiddleware
            </text>
          </svg>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1 — Source code */}
        <div className="edge-card flex flex-col justify-between bg-ink/70 p-4">
          <div>
            <PanelHeader
              dotClass="bg-lightning-yellow"
              title={data.file}
              badge={<span className="badge text-ash">1. Source Code</span>}
            />
            <pre className="overflow-x-auto font-mono text-mono leading-[1.65] text-mist">
              {data.source}
            </pre>
          </div>
          <p className="mt-4 border-t border-graphite pt-3 font-mono text-tiny text-smoke">
            Mount terdeteksi:{" "}
            <span className="text-ash">app.use(&apos;/api/v1&apos;, router)</span>
          </p>
        </div>

        {/* 2 — AST descriptor */}
        <div className="edge-card flex flex-col justify-between bg-ink/70 p-4">
          <div>
            <PanelHeader
              dotClass="bg-ash"
              title="Extracted AST Contract"
              badge={<span className="badge badge-gold">2. AST Descriptor</span>}
            />
            <pre className="overflow-x-auto font-mono text-mono leading-[1.65] text-ash">
              {data.ast}
            </pre>
          </div>
          <p className="mt-4 border-t border-graphite pt-3 font-mono text-tiny text-smoke">
            Foreign key terdeteksi:{" "}
            <span className="text-electric-gold">
              lahanId → GET /api/v1/lahan
            </span>
          </p>
        </div>

        {/* 3 — Synthesized payload */}
        <div className="key-card-amber flex flex-col justify-between p-4">
          <div>
            <PanelHeader
              dotClass="bg-ok"
              title="Synthesized Request Body"
              badge={<span className="badge badge-amber">3. Live Payload</span>}
              borderClass="border-dark-amber"
            />
            <pre className="overflow-x-auto font-mono text-mono leading-[1.65] text-pure-white">
              {data.payload}
            </pre>
          </div>
          <p className="mt-4 flex items-center justify-between gap-3 border-t border-dark-amber pt-3 font-mono text-tiny text-mist">
            <span>
              Status uji: <span className="text-ok">201 Created (58ms)</span>
            </span>
            <span>0 UUID palsu</span>
          </p>
        </div>
      </div>
    </Section>
  );
}

function PanelHeader({
  dotClass,
  title,
  badge,
  borderClass = "border-slate",
}: {
  dotClass: string;
  title: string;
  badge: React.ReactNode;
  borderClass?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-2 border-b pb-3 ${borderClass}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="truncate font-mono text-mono text-pure-white">{title}</span>
      </div>
      {badge}
    </div>
  );
}
