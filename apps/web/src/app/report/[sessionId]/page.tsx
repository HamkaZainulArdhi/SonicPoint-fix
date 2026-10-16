import Link from "next/link";
import { notFound } from "next/navigation";
import { EndpointTable } from "@/components/EndpointTable";
import { getEndpointsBySession, getSessionById } from "@/lib/queries";

// Report page diakses via shareable URL kapan saja → render saat request, bukan saat build.
export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  const endpoints = await getEndpointsBySession(session.id);

  return (
    <div>
      <Link
        href={`/projects/${session.project_id}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Sessions
      </Link>

      <h1 className="mt-2 text-2xl font-bold">Session report</h1>
      <p className="mt-1 font-mono text-xs text-gray-400">{session.id}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Tested</div>
          <div className="text-xl font-bold">{session.total_tested}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Passed</div>
          <div className="text-xl font-bold text-green-700">
            {session.total_success}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Failed</div>
          <div className="text-xl font-bold text-red-700">
            {session.total_failed}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Skipped</div>
          <div className="text-xl font-bold text-gray-500">
            {session.total_skipped}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Endpoints</h2>
      <div className="mt-4">
        <EndpointTable endpoints={endpoints} />
      </div>
    </div>
  );
}
