"use client";

import { useMemo, useState } from "react";
import type { Endpoint } from "@/types";
import { formatDateTime, formatLatency, isSkippedStatus, prettyJson, prettyMaybeJson } from "@/lib/format";
import { CodeBlock } from "./CodeBlock";
import { MethodChip } from "./MethodChip";
import { StatusBadge } from "./StatusBadge";

const filterIdle =
  "rounded-full border border-charcoal px-3 py-1 font-mono text-caption text-silver-mist transition-colors hover:border-slate hover:text-snow";
const filterActive =
  "rounded-full border border-lightning-yellow/60 bg-lightning-yellow/10 px-3 py-1 font-mono text-caption text-lightning-yellow";

export function EndpointList({ endpoints }: { endpoints: Endpoint[] }) {
  const [method, setMethod] = useState("ALL");
  const [query, setQuery] = useState("");

  const methods = useMemo(
    () => [...new Set(endpoints.map((e) => e.method.toUpperCase()))].sort(),
    [endpoints],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((e) => {
      if (method !== "ALL" && e.method.toUpperCase() !== method) return false;
      if (!q) return true;
      return (
        e.resolved_path.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q)
      );
    });
  }, [endpoints, method, query]);

  if (endpoints.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-charcoal p-6 text-body-sm text-smoke">
        Session ini belum punya endpoint.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", ...methods].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMethod(item)}
              className={item === method ? filterActive : filterIdle}
            >
              {item === "ALL" ? "SEMUA" : item}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari path…"
          className="w-full max-w-56 rounded-lg border border-slate bg-obsidian px-3 py-1.5 text-body-sm text-snow transition-colors placeholder:text-smoke focus:border-electric-gold"
        />

        <span className="ml-auto font-mono text-caption text-smoke">
          {filtered.length} / {endpoints.length}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {filtered.map((endpoint) => (
          <EndpointRow key={endpoint.id} endpoint={endpoint} />
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-charcoal p-6 text-center text-body-sm text-smoke">
          Tidak ada endpoint yang cocok dengan filter.
        </p>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-charcoal/60 pb-1.5">
      <dt className="shrink-0 text-smoke">{label}</dt>
      <dd className="truncate font-mono text-caption text-silver-mist">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h4 className="font-mono text-caption uppercase text-graphite">{title}</h4>
      {children}
    </div>
  );
}

function EndpointRow({ endpoint: e }: { endpoint: Endpoint }) {
  const skipped = isSkippedStatus(e.status_code);

  return (
    <li>
      <details className="group overflow-hidden rounded-2xl border border-charcoal bg-obsidian open:border-slate">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
          <MethodChip method={e.method} />
          <span className="truncate font-mono text-body-sm text-snow">
            {e.resolved_path}
          </span>

          {e.ai_generated && !skipped ? (
            <span
              title="Payload disusun dengan AI"
              className="rounded-full border border-amber-depth/60 px-2 py-px font-mono text-caption text-electric-gold"
            >
              AI
            </span>
          ) : null}

          <span className="ml-auto flex shrink-0 items-center gap-4">
            <span className="hidden font-mono text-caption text-smoke sm:inline">
              {formatLatency(e.latency_ms, skipped)}
            </span>
            <StatusBadge success={e.success} statusCode={e.status_code} />
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5 text-graphite transition-transform group-open:rotate-90"
            >
              <path d="m6 3 5 5-5 5" />
            </svg>
          </span>
        </summary>

        <div className="border-t border-charcoal px-4 py-4">
          <dl className="grid gap-x-10 gap-y-2 text-body-sm sm:grid-cols-2">
            <Meta label="Path template" value={e.path} />
            {e.resolved_path !== e.path ? (
              <Meta label="Resolved" value={e.resolved_path} />
            ) : null}
            <Meta
              label="Auth"
              value={e.auth_used === "bearer" ? "Bearer token" : "tanpa auth"}
            />
            <Meta label="Urutan" value={String(e.execution_order)} />
            <Meta label="Diuji" value={formatDateTime(e.tested_at)} />
          </dl>

          {e.payload ? (
            <Section title="Request body">
              <CodeBlock code={prettyJson(e.payload)} className="mt-2" />
            </Section>
          ) : null}

          {e.response_preview ? (
            <Section title="Response preview">
              <CodeBlock code={prettyMaybeJson(e.response_preview)} className="mt-2" />
            </Section>
          ) : null}

          {e.error_message ? (
            <Section title={skipped ? "Alasan skip" : "Error"}>
              <p className="mt-2 rounded-lg border border-err/30 bg-err/5 p-3 font-mono text-code text-err">
                {e.error_message}
              </p>
            </Section>
          ) : null}
        </div>
      </details>
    </li>
  );
}
