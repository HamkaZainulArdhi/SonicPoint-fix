"use client";

import { useMemo, useState } from "react";
import { demoReport, reportItems, type ReportItem } from "@/lib/landing";
import { IconChevron } from "@/components/icons";
import { MethodChip } from "@/components/MethodChip";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge, Section, WindowFrame } from "@/components/ui";

type Filter = "ALL" | "PASS" | "FAIL" | "SKIP";
type Category = Exclude<Filter, "ALL">;

function categoryOf(item: ReportItem): Category {
  if (item.status === "SKIPPED") return "SKIP";
  return item.success ? "PASS" : "FAIL";
}

const labels: Record<Category, string> = {
  PASS: "2xx Passed",
  FAIL: "5xx Failed",
  SKIP: "Skipped",
};

const idleTone: Record<Filter, string> = {
  ALL: "text-ash",
  PASS: "text-ok",
  FAIL: "text-err",
  SKIP: "text-warn",
};

function pillClass(active: boolean, key: Filter): string {
  if (active) {
    return "rounded-md bg-mist px-2.5 py-1.5 font-mono text-tiny font-medium text-void-black";
  }
  return `rounded-md border border-slate bg-obsidian px-2.5 py-1.5 font-mono text-tiny transition-colors hover:border-iron ${idleTone[key]}`;
}

/** Mockup laporan publik — baris accordion + filter pill (state React, bukan DOM). */
export function ReportPreview() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [openId, setOpenId] = useState<string | null>("rep-1");

  const counts = useMemo(() => {
    const base = { ALL: reportItems.length, PASS: 0, FAIL: 0, SKIP: 0 };
    for (const item of reportItems) base[categoryOf(item)] += 1;
    return base;
  }, []);

  const items =
    filter === "ALL"
      ? reportItems
      : reportItems.filter((item) => categoryOf(item) === filter);

  return (
    <Section
      id="report-preview"
      sec="SEC // 04 · HONEST_REPORT_VIEWER"
      eyebrow="Honest Web Report Preview"
      eyebrowTone="amber"
      title="Hasil akhirnya: satu link laporan yang jujur & transparan."
      description={
        <>
          Saat kamu menjalankan{" "}
          <code className="font-mono text-code text-mist">sonic-point report</code>
          , rekan tim frontend atau QA langsung bisa membuka URL laporan ini —
          lengkap dengan payload yang dikirim, respons server, dan alasan skip.
          Klik baris di bawah untuk mencoba.
        </>
      }
      bg="dots"
      aside={
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "PASS", "FAIL", "SKIP"] as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={pillClass(key === filter, key)}
            >
              {key === "ALL" ? `All (${counts.ALL})` : `${labels[key]} (${counts[key]})`}
            </button>
          ))}
        </div>
      }
      glow={
        <div className="absolute left-1/2 top-[60%] h-[360px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-depth/10 blur-[95px]" />
      }
    >
      <WindowFrame className="p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-graphite pb-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="size-2 shrink-0 rotate-45 bg-lightning-yellow" />
            <span className="truncate font-mono text-mono text-pure-white">
              {demoReport.url}
            </span>
            <Badge className="shrink-0 text-ok">Public Read-Only</Badge>
          </div>
          <div className="font-mono text-tiny text-smoke">
            Target: <span className="text-mist">{demoReport.target}</span> · Durasi{" "}
            <span className="text-mist">{demoReport.duration}</span>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const open = openId === item.id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border border-slate bg-void-black"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-obsidian"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <MethodChip method={item.method} />
                    <span className="truncate font-mono text-code text-pure-white">
                      {item.path}
                    </span>
                    <span className="hidden truncate text-mono text-smoke sm:inline">
                      — {item.summary}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <span className="font-mono text-tiny text-smoke">{item.latency}</span>
                    <StatusBadge success={item.success} statusCode={item.status} />
                    <IconChevron
                      className={`size-3 text-iron transition-transform ${open ? "rotate-90" : ""}`}
                    />
                  </span>
                </button>

                {open ? (
                  <div className="grid grid-cols-1 gap-3 border-t border-graphite bg-ink p-3.5 md:grid-cols-2">
                    <div>
                      <div className="mb-1.5 font-mono text-micro uppercase tracking-[0.05em] text-smoke">
                        Request payload
                      </div>
                      <pre className="overflow-x-auto rounded-md border border-graphite bg-void-black p-2.5 font-mono text-tiny text-mist">
                        {item.reqBody}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1.5 font-mono text-micro uppercase tracking-[0.05em] text-smoke">
                        Respons server
                      </div>
                      <pre className="overflow-x-auto rounded-md border border-graphite bg-void-black p-2.5 font-mono text-tiny text-ash">
                        {item.resBody}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </WindowFrame>
    </Section>
  );
}
