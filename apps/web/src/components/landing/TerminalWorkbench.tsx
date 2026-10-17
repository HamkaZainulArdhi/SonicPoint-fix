"use client";

import { useEffect, useState } from "react";
import {
  tabPresets,
  terminalTabs,
  workbenchEndpoints,
  type Line,
  type TerminalTabKey,
  type WorkbenchEndpoint,
} from "@/lib/landing";
import { Segs } from "@/components/Segs";
import { Kbd, Section, WindowFrame } from "@/components/ui";

type View =
  | { kind: "endpoint"; id: number }
  | { kind: "tab"; key: TerminalTabKey };

type Display = {
  prompt: string;
  heading: string;
  badge: string;
  status: string;
  statusTone: "ok" | "err" | "warn";
  lines: Line[];
  json: string;
};

const toneText = {
  ok: "text-ok",
  err: "text-err",
  warn: "text-warn",
} as const;

function presetDisplay(key: TerminalTabKey): Display {
  const preset = tabPresets[key];
  return { ...preset, statusTone: "ok" };
}

function endpointDisplay(endpoint: WorkbenchEndpoint): Display {
  return {
    prompt: `sonic-point > inspect ${endpoint.method} ${endpoint.path}`,
    heading: `${endpoint.method} ${endpoint.path} — ${endpoint.schema}`,
    badge: endpoint.status,
    status:
      endpoint.latency === "—"
        ? `Last run: ${endpoint.status} · tanpa latensi`
        : `Last run: ${endpoint.status} · latensi ${endpoint.latency}`,
    statusTone: endpoint.statusTone,
    lines: endpoint.detail,
    json: endpoint.jsonPreview,
  };
}

/**
 * Simulasi REPL di browser: tab slash command (hotkey 1-5 untuk endpoint),
 * daftar endpoint AST, output eksekusi, preview payload, dan status bar.
 */
export function TerminalWorkbench() {
  const [tab, setTab] = useState<TerminalTabKey>("scan");
  const [view, setView] = useState<View>({ kind: "endpoint", id: 2 });

  // Hotkey 1-5 memilih endpoint — abaikan saat user sedang mengetik.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      ) {
        return;
      }

      const index = "12345".indexOf(event.key);
      if (index === -1) return;
      const endpoint = workbenchEndpoints[index];
      if (!endpoint) return;

      event.preventDefault();
      setView({ kind: "endpoint", id: endpoint.id });
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const display =
    view.kind === "tab" ? presetDisplay(view.key) : endpointDisplay(workbenchEndpoints[view.id]);

  return (
    <Section
      id="preview"
      sec="SEC // 01 · REPL_WORKBENCH"
      eyebrow="Interactive CLI Workbench"
      eyebrowTone="amber"
      title="Simulasikan REPL langsung di browser."
      aside={
        <div className="flex items-center gap-2 font-mono text-mono text-ash">
          <span>Navigasi cepat:</span>
          {["1", "2", "3", "4", "5"].map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </div>
      }
      bg="dots"
      glow={
        <div className="absolute left-1/2 top-[56%] h-[420px] w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-lightning-yellow/[0.07] via-amber-depth/[0.08] to-transparent blur-[80px]" />
      }
    >
      <WindowFrame className="mx-auto max-w-[1040px] p-2">
        {/* Top command bar */}
        <div className="rounded-xl bg-obsidian p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 pl-1">
                <span className="size-2.5 rounded-full bg-lightning-yellow/80" />
                <span className="size-2.5 rounded-full bg-warn/80" />
                <span className="size-2.5 rounded-full bg-ok/80" />
              </div>
              <div className="h-3.5 w-px bg-slate" />
              <div className="flex items-center gap-2 font-mono text-mono text-pure-white">
                <span className="size-[7px] rotate-45 bg-lightning-yellow" />
                <span>{display.prompt}</span>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Simulasi perintah CLI"
              className="flex flex-wrap items-center gap-1.5"
            >
              {terminalTabs.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => {
                    setTab(key);
                    setView({ kind: "tab", key });
                  }}
                  className={`rounded-md px-2.5 py-1 font-mono text-tiny transition-colors ${
                    tab === key
                      ? "bg-lightning-yellow font-medium text-void-black"
                      : "bg-graphite text-ash hover:text-pure-white"
                  }`}
                >
                  /{key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-12">
          {/* Endpoint list + session cache */}
          <div className="flex flex-col justify-between rounded-lg border border-graphite bg-void-black/70 p-3 lg:col-span-5">
            <div>
              <div className="mb-2 flex items-center justify-between border-b border-graphite pb-2">
                <span className="font-mono text-micro uppercase tracking-[0.05em] text-smoke">
                  Express AST Endpoints ({workbenchEndpoints.length})
                </span>
                <span className="font-mono text-micro text-ash">
                  src/routes/index.ts
                </span>
              </div>

              <div className="space-y-1">
                {workbenchEndpoints.map((endpoint, index) => {
                  const selected =
                    view.kind === "endpoint" && view.id === endpoint.id;

                  return (
                    <button
                      key={endpoint.id}
                      type="button"
                      onClick={() => setView({ kind: "endpoint", id: endpoint.id })}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? "border-lightning-yellow/60 bg-lightning-yellow/15 text-pure-white"
                          : "border-transparent text-ash hover:bg-obsidian hover:text-pure-white"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            selected ? "bg-lightning-yellow" : "bg-slate"
                          }`}
                        />
                        <span className="badge shrink-0">{endpoint.method}</span>
                        <span className="truncate font-mono text-mono">
                          {endpoint.path}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-micro text-smoke">
                          {endpoint.latency}
                        </span>
                        <Kbd className="px-1 py-0 text-micro">{index + 1}</Kbd>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate bg-obsidian p-2.5">
              <div className="flex items-center justify-between font-mono text-micro text-ash">
                <span>SESSION AUTH &amp; CACHE</span>
                <span className="text-ok">● ACTIVE</span>
              </div>
              <dl className="mt-1.5 space-y-0.5 font-mono text-tiny text-smoke">
                <SessionRow label="Bearer token" value="eyJhbGci...9xKp" />
                <SessionRow label="Cached lahanId" value="14 ID asli" />
                <SessionRow label="Cached itemId" value="22 ID asli" />
              </dl>
            </div>
          </div>

          {/* Inspector */}
          <div className="flex min-h-[360px] flex-col justify-between rounded-lg border border-graphite bg-void-black p-4 lg:col-span-7">
            <div>
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-graphite pb-2">
                <span className="truncate font-mono text-micro uppercase tracking-[0.05em] text-smoke">
                  {display.heading}
                </span>
                <span className={`badge shrink-0 ${toneText[display.statusTone]}`}>
                  {display.badge}
                </span>
              </div>

              <div className="space-y-1.5 overflow-x-auto font-mono text-mono text-ash">
                {display.lines.map((line, index) => (
                  <div key={index}>
                    <Segs segs={line} />
                  </div>
                ))}
              </div>
            </div>

            <pre className="mt-3.5 overflow-x-auto rounded-md border border-graphite bg-ink p-2.5 font-mono text-tiny text-mist">
              {display.json}
            </pre>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-graphite pt-3 font-mono text-tiny text-smoke">
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    display.statusTone === "err"
                      ? "bg-err"
                      : display.statusTone === "warn"
                        ? "bg-warn"
                        : "bg-ok animate-flow"
                  }`}
                />
                <span>{display.status}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>Tekan</span>
                <Kbd className="text-micro">1-5</Kbd>
                <span>atau klik endpoint di kiri</span>
              </span>
            </div>
          </div>
        </div>
      </WindowFrame>
    </Section>
  );
}

function SessionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="truncate">{label}:</dt>
      <dd className="shrink-0 text-mist">{value}</dd>
    </div>
  );
}
