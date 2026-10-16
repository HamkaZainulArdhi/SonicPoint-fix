import type { Endpoint } from "@/types";
import { StatusBadge } from "./StatusBadge";

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-sky-700";
    case "POST":
      return "text-green-700";
    case "PUT":
    case "PATCH":
      return "text-amber-700";
    case "DELETE":
      return "text-red-700";
    default:
      return "text-gray-700";
  }
}

export function EndpointTable({ endpoints }: { endpoints: Endpoint[] }) {
  if (endpoints.length === 0) {
    return (
      <p className="text-sm text-gray-500">No endpoints in this session.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-500">#</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              Method
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              Path
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              Status
            </th>
            <th className="px-4 py-2 text-right font-medium text-gray-500">
              Latency
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {endpoints.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-2 text-gray-400">{e.execution_order}</td>
              <td className={`px-4 py-2 font-mono font-semibold ${methodColor(e.method)}`}>
                {e.method}
              </td>
              <td className="px-4 py-2 font-mono text-gray-800">
                {e.resolved_path}
                {e.resolved_path !== e.path && (
                  <span className="block text-xs text-gray-400">{e.path}</span>
                )}
              </td>
              <td className="px-4 py-2">
                <StatusBadge success={e.success} statusCode={e.status_code} />
              </td>
              <td className="px-4 py-2 text-right text-gray-600">
                {e.latency_ms}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
