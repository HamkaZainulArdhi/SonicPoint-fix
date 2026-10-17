"use client";

import { useMemo, useState } from "react";
import type { Endpoint } from "@/types";
import { formatDateTime, formatLatency, isSkippedStatus, prettyJson, prettyMaybeJson } from "@/lib/format";
import { CodeBlock } from "./CodeBlock";
import { IconChevron } from "./icons";
import { MethodChip } from "./MethodChip";
import { StatusBadge } from "./StatusBadge";

const filterIdle =
  "rounded-md border border-slate bg-obsidian px-2.5 py-1 font-mono text-tiny text-ash transition-colors hover:border-iron hover:text-pure-white";
const filterActive =
  "rounded-md bg-mist px-2.5 py-1 font-mono text-tiny font-medium text-void-black";

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
      <p className="rounded-lg border border-dashed border-slate p-6 text-body-sm text-smoke">
        Session ini belum punya endpoint.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
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
          className="w-full max-w-56 rounded-lg border border-slate bg-void-black/60 px-3 py-1.5 font-mono text-tiny text-pure-white transition-colors placeholder:text-smoke focus:border-amber-depth/70 focus:outline-none"
        />

        <span className="ml-auto font-mono text-tiny text-smoke">
          {filtered.length} / {endpoints.length}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {filtered.map((endpoint) => (
          <EndpointRow key={endpoint.id} endpoint={endpoint} />
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate p-6 text-center text-body-sm text-smoke">
          Tidak ada endpoint yang cocok dengan filter.
        </p>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-graphite pb-1.5">
      <dt className="shrink-0 font-mono text-micro uppercase tracking-[0.05em] text-smoke">
        {label}
      </dt>
      <dd className="truncate font-mono text-mono text-mist">{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="font-mono text-micro uppercase tracking-[0.05em] text-smoke">
        {title}
      </h4>
      {children}
    </div>
  );
}

function EndpointRow({ endpoint: e }: { endpoint: Endpoint }) {
  const skipped = isSkippedStatus(e.status_code);

  return (
    <li>
      <details className="group overflow-hidden rounded-lg border border-slate bg-void-black open:border-iron">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 transition-colors hover:bg-obsidian [&::-webkit-details-marker]:hidden">
          <MethodChip method={e.method} />
          <span className="truncate font-mono text-code text-pure-white">
            {e.resolved_path}
          </span>

          {e.ai_generated && !skipped ? (
            <span title="Payload disusun dengan AI" className="badge badge-amber shrink-0">
              AI
            </span>
          ) : null}

          <span className="ml-auto flex shrink-0 items-center gap-3.5">
            <span className="hidden font-mono text-tiny text-smoke sm:inline">
              {formatLatency(e.latency_ms, skipped)}
            </span>
            <StatusBadge success={e.success} statusCode={e.status_code} />
            <IconChevron className="size-3 text-iron transition-transform group-open:rotate-90" />
          </span>
        </summary>

        <div className="border-t border-graphite bg-ink/40 px-3.5 py-4">
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
            <Block title="Request body">
              <CodeBlock code={prettyJson(e.payload)} className="mt-2" />
            </Block>
          ) : null}

          {e.response_preview ? (
            <Block title="Response preview">
              <CodeBlock code={prettyMaybeJson(e.response_preview)} className="mt-2" />
            </Block>
          ) : null}

          {e.error_message ? (
            <Block title={skipped ? "Alasan skip" : "Error"}>
              <p className="mt-2 rounded-lg border border-err/30 bg-err/[0.06] p-3 font-mono text-code text-err">
                {e.error_message}
              </p>
            </Block>
          ) : null}
        </div>
      </details>
    </li>
  );
}
