import { Endpoint } from "../domain/endpoint.js";

export type TargetFilter = { method?: string; path?: string };

export type Selection = { ok: true; endpoints: Endpoint[] } | { ok: false; error: string; hint?: string };

/** Default `send` scope is GET endpoints; --method requires an explicit target. */
export function selectTargets(endpoints: Endpoint[], filter: TargetFilter): Selection {
  if (!filter.method) {
    return { ok: true, endpoints: endpoints.filter((endpoint) => endpoint.method === "GET") };
  }

  if (!filter.path) {
    return {
      ok: false,
      error: "An endpoint target is required with --method.",
      hint: "send --method POST /api/items",
    };
  }

  const method = filter.method.toUpperCase();
  const match = endpoints.find(
    (endpoint) => endpoint.method === method && samePath(endpoint.path, filter.path as string),
  );

  if (!match) {
    return { ok: false, error: `Endpoint not found: ${method} ${filter.path}.` };
  }

  return { ok: true, endpoints: [match] };
}

function samePath(left: string, right: string): boolean {
  const clean = (value: string) => (value === "/" ? value : value.replace(/\/+$/, "") || "/");
  return clean(left) === clean(right);
}
