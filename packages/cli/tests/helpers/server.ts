// Fake backend for send/report tests. Instead of hand-rolling `http.createServer`
// in every suite, a test declares `request → response` and reads back the log.

import http from "node:http";

export interface TestRequest {
  method: string;
  url: string;
  /** Parsed JSON body (undefined for GET, raw string when not JSON). */
  body: unknown;
}

export interface TestResponse {
  /** Defaults to 200. */
  status?: number;
  body?: unknown;
}

export interface TestServer {
  url: string;
  requests: TestRequest[];
  close(): Promise<void>;
}

export async function startServer(
  handler: (request: TestRequest) => TestResponse | Promise<TestResponse>,
): Promise<TestServer> {
  const requests: TestRequest[] = [];

  const server = http.createServer((req, res) => {
    void (async () => {
      const request: TestRequest = {
        method: req.method ?? "GET",
        url: req.url ?? "/",
        body: await readBody(req),
      };
      requests.push(request);

      try {
        const answer = await handler(request);
        res.writeHead(answer.status ?? 200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(answer.body ?? {}));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

/** Requests that hit `method path`, ignoring a trailing-slash difference. */
export function hits(server: TestServer, method: string, path: string): TestRequest[] {
  const wanted = normalize(path);
  return server.requests.filter(
    (request) => request.method === method && normalize(request.url) === wanted,
  );
}

/** JSON bodies of every request that hit `method path`. */
export function bodies(
  server: TestServer,
  method: string,
  path: string,
): Record<string, unknown>[] {
  return hits(server, method, path).map((request) => request.body as Record<string, unknown>);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalize(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}
