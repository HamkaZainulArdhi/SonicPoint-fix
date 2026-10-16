// Lowest-level HTTP: one request, one preflight check. Throws nothing;
// transport failures are returned as data.

export type Fetch = typeof fetch;

export interface HttpResult {
  ok: boolean;
  status: number | "ERROR";
  body?: unknown;
  error?: string;
  latencyMs: number;
}

export async function request(
  method: string,
  url: string,
  token: string,
  fetchImpl: Fetch,
  body?: Record<string, unknown>,
): Promise<HttpResult> {
  const startedAt = Date.now();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  if (body) headers["Content-Type"] = "application/json";

  try {
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return {
      ok: response.ok,
      status: response.status,
      body: await readBody(response),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: "ERROR",
      error: describeError(error, url),
      latencyMs: Date.now() - startedAt,
    };
  }
}

/** Fails when the base URL is malformed or the server is unreachable. */
export async function checkServer(baseUrl: string, fetchImpl: Fetch): Promise<{ ok: true } | { ok: false; reason: string }> {
  let origin: string;

  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return { ok: false, reason: `Invalid base URL: ${baseUrl}` };
  }

  try {
    await fetchImpl(`${origin}/`, { method: "GET" });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: describeError(error, `${origin}/`) };
  }
}

export function joinUrl(baseUrl: string, routePath: string): string {
  return `${baseUrl.replace(/\/$/, "")}${routePath}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describeError(error: unknown, url: string): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const detail =
      cause && typeof cause === "object"
        ? [String((cause as { code?: unknown }).code ?? ""), String((cause as { message?: unknown }).message ?? "")]
            .map((part) => part.trim())
            .filter(Boolean)
            .join(": ")
        : "";

    return `fetch failed for ${url} (${detail || error.message})`;
  }

  return `fetch failed for ${url}`;
}
