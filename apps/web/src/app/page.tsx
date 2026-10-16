import Link from "next/link";
import { getProjects } from "@/lib/queries";

// Data berubah setiap CLI publish session baru → render saat request, bukan saat build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await getProjects();

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-gray-500">
        Test reports published by the sonic-point CLI.
      </p>

      {projects.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          No projects yet. Run{" "}
          <code className="font-mono">sonic-point send</code> then{" "}
          <code className="font-mono">sonic-point report</code> to publish your
          first session.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm"
              >
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 font-mono text-xs text-gray-400">
                  {p.slug}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
