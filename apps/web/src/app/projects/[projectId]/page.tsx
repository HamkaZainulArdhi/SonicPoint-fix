import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getSessionsByProject } from "@/lib/queries";

// Data berubah setiap CLI publish session baru → render saat request, bukan saat build.
export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const sessions = await getSessionsByProject(project.id);

  return (
    <div>
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
      <p className="mt-1 font-mono text-xs text-gray-400">{project.slug}</p>

      <h2 className="mt-8 text-lg font-semibold">Sessions</h2>
      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No sessions published for this project yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/report/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 hover:shadow-sm"
              >
                <div>
                  <div className="font-mono text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium text-green-700">
                      {s.total_success} passed
                    </span>
                    {" · "}
                    <span className="font-medium text-red-700">
                      {s.total_failed} failed
                    </span>
                    {" · "}
                    <span className="text-gray-500">
                      {s.total_skipped} skipped
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
