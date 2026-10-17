import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { EndpointList } from "@/components/EndpointList";
import { card } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getEndpointsBySession, getSessionById } from "@/lib/queries";
import type { SessionStatus } from "@/types";

// Report diakses kapan saja via link → render saat request, bukan saat build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan sesi",
  description: "Hasil pengujian endpoint dari satu sesi sonic-point.",
};

const statusTones: Record<SessionStatus, { label: string; tone: string }> = {
  completed: { label: "selesai", tone: "border-ok/40 bg-ok/10 text-ok" },
  running: { label: "berjalan", tone: "border-lightning-yellow/50 bg-lightning-yellow/10 text-lightning-yellow" },
  failed: { label: "gagal", tone: "border-err/40 bg-err/10 text-err" },
};

function Stat({
  label,
  value,
  tone = "text-snow",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={`${card} p-4`}>
      <div className="text-caption text-smoke">{label}</div>
      <div className={`mt-1 text-heading-sm font-normal tabular-nums ${tone}`}>
        {value}
      </div>
    </div>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  const endpoints = await getEndpointsBySession(session.id);

  const durationMs =
    session.finished_at && session.started_at
      ? new Date(session.finished_at).getTime() -
        new Date(session.started_at).getTime()
      : null;

  const status = statusTones[session.status] ?? statusTones.running;

  return (
    <div className="mx-auto max-w-page px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-charcoal bg-ash px-3 py-1 font-mono text-caption text-silver-mist">
          {session.id}
        </span>
        <CopyButton value={session.id} label="Salin id" />
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-caption ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <h1 className="mt-6 text-heading font-normal text-snow">
        Laporan sesi pengujian
      </h1>
      <p className="mt-2 text-body-sm text-smoke">
        Diuji {formatDateTime(session.started_at)}
        {durationMs !== null ? ` · ${formatDuration(durationMs)}` : ""} ·{" "}
        {endpoints.length} endpoint
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Diuji" value={session.total_tested} />
        <Stat label="Lolos" value={session.total_success} tone="text-ok" />
        <Stat
          label="Gagal"
          value={session.total_failed}
          tone={session.total_failed > 0 ? "text-err" : "text-smoke"}
        />
        <Stat label="Di-skip" value={session.total_skipped} tone="text-smoke" />
      </div>

      <section className="mt-12">
        <h2 className="text-heading-sm font-medium text-snow">Endpoint</h2>
        <div className="mt-4">
          <EndpointList endpoints={endpoints} />
        </div>
      </section>
    </div>
  );
}
