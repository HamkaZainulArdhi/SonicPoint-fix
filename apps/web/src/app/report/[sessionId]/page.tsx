import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { EndpointList } from "@/components/EndpointList";
import { MiniHeader } from "@/components/MiniHeader";
import { LogoMark } from "@/components/ui";
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
  running: {
    label: "berjalan",
    tone: "border-amber-depth/50 bg-amber-depth/10 text-warn",
  },
  failed: { label: "gagal", tone: "border-err/40 bg-err/10 text-err" },
};

function Stat({
  label,
  value,
  tone = "text-pure-white",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate bg-ink/80 p-4 shadow-edge">
      <div className="font-mono text-micro uppercase tracking-[0.05em] text-smoke">
        {label}
      </div>
      <div className={`mt-1.5 text-heading-sm font-medium tabular-nums ${tone}`}>
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
    <>
      <MiniHeader />
      <div className="mx-auto max-w-page px-6 pb-16 pt-2">
        <div className="window-frame p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <LogoMark />
              <span className="font-mono text-code text-pure-white">
                Laporan sesi
              </span>
              <span className="badge" title={session.id}>
                #{session.id.slice(0, 8)}
              </span>
              <CopyButton value={session.id} label="Salin id" />
              <span
                className={`rounded-[5px] border px-2 py-0.5 font-mono text-micro uppercase tracking-[0.05em] ${status.tone}`}
              >
                {status.label}
              </span>
            </div>
            <div className="font-mono text-tiny text-smoke">
              Diuji {formatDateTime(session.started_at)}
              {durationMs !== null ? ` · ${formatDuration(durationMs)}` : ""}
            </div>
          </div>

          <h1 className="mt-5 text-heading-sm font-normal text-pure-white sm:text-heading">
            Laporan sesi pengujian
          </h1>
          <p className="mt-2 text-body-sm text-ash">
            Payload, respons, status, dan latensi per endpoint — apa adanya.{" "}
            {endpoints.length} endpoint tercatat.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Diuji" value={session.total_tested} />
            <Stat label="Lolos" value={session.total_success} tone="text-ok" />
            <Stat
              label="Gagal"
              value={session.total_failed}
              tone={session.total_failed > 0 ? "text-err" : "text-smoke"}
            />
            <Stat label="Di-skip" value={session.total_skipped} tone="text-smoke" />
          </div>

          <section className="mt-10">
            <h2 className="text-title font-medium text-pure-white">Endpoint</h2>
            <div className="mt-4">
              <EndpointList endpoints={endpoints} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
