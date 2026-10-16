import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { saveCredentials } from "../src/config/app.js";
import { runTest } from "../src/tui/repl/dispatchCommands.js";
import {
  concreteParamsForTemplate,
  parseTestArgs,
} from "../src/tui/repl/testArgs.js";
import { toTestLines } from "../src/tui/views/testView.js";
import { TestSession } from "../src/domain/session.js";

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-tui-test-"));
  fs.mkdirSync(path.join(root, "src", "routes"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "src", "app.js"),
    `
    import express from "express";
    import itemRoutes from "./routes/itemRoutes.js";
    const app = express();
    app.use("/api/items", itemRoutes);
    export default app;
    `.trimStart(),
  );
  fs.writeFileSync(
    path.join(root, "src", "routes", "itemRoutes.js"),
    `
    import express from "express";
    const router = express.Router();
    router.get("/", async () => {});
    router.get("/:itemId", async () => {});
    router.post("/", async () => {});
    export default router;
    `.trimStart(),
  );
  return root;
}

function credentials(baseUrl: string) {
  return {
    baseUrl,
    loginEndpoint: "/api/auth/login",
    email: "admin@example.com",
    password: "admin123",
    tokenField: "data.token",
    token: "preset-token",
  };
}

function listen(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  const server = http.createServer(handler);
  return {
    server,
    async port(): Promise<number> {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      return (server.address() as { port: number }).port;
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

describe("parseTestArgs (strict, method wajib)", () => {
  it("rejects bare /test", () => {
    const parsed = parseTestArgs([]);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /method is required/);
  });

  it("rejects a bare path without method", () => {
    const parsed = parseTestArgs(["/api/items"]);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /Unknown method/);
  });

  it("rejects unknown methods", () => {
    const parsed = parseTestArgs(["FOO", "/x"]);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.hint, /GET POST PUT PATCH DELETE/);
  });

  it("accepts bulk GET (case-insensitive)", () => {
    const parsed = parseTestArgs(["get"]);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.filter, { kind: "bulk", method: "GET" });
  });

  it("rejects bulk write without a path", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const parsed = parseTestArgs([method]);
      assert.equal(parsed.ok, false, method);
      if (!parsed.ok) assert.match(parsed.error, /require a path/);
    }
  });

  it("accepts a single endpoint and normalizes trailing slashes", () => {
    const parsed = parseTestArgs(["post", "/api/v1/lahan/"]);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.filter, { kind: "single", method: "POST", path: "/api/v1/lahan" });
  });

  it("rejects paths without a leading slash and too many args", () => {
    const noSlash = parseTestArgs(["GET", "api/items"]);
    assert.equal(noSlash.ok, false);
    const extra = parseTestArgs(["GET", "/a", "/b"]);
    assert.equal(extra.ok, false);
    if (!extra.ok) assert.match(extra.error, /too many arguments/);
  });
});

describe("concreteParamsForTemplate", () => {
  it("maps concrete segments to :param names", () => {
    assert.deepEqual(
      [...(concreteParamsForTemplate("/api/items/:itemId", "/api/items/item-42") ?? [])],
      [["itemId", "item-42"]],
    );
  });

  it("returns null on static mismatch or length mismatch", () => {
    assert.equal(concreteParamsForTemplate("/api/items/:itemId", "/api/other/item-42"), null);
    assert.equal(concreteParamsForTemplate("/api/items/:itemId", "/api/items"), null);
    assert.equal(concreteParamsForTemplate("/api/items", "/api/items"), null);
  });
});

describe("toTestLines", () => {
  function session(): TestSession {
    return {
      project: { slug: "demo", name: "demo" },
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(0).toISOString(),
      results: [
        {
          kind: "executed",
          order: 1,
          method: "GET",
          path: "/api/items",
          resolvedPath: "/api/items",
          statusCode: 200,
          success: true,
          latencyMs: 12,
          auth: "bearer",
          aiGenerated: false,
          testedAt: new Date(0).toISOString(),
        },
        {
          kind: "executed",
          order: 2,
          method: "POST",
          path: "/api/items",
          resolvedPath: "/api/items",
          statusCode: 500,
          success: false,
          latencyMs: 30,
          auth: "bearer",
          aiGenerated: false,
          testedAt: new Date(0).toISOString(),
          error: "boom",
        },
        {
          kind: "skipped",
          order: 3,
          method: "GET",
          path: "/api/items/:itemId",
          resolvedPath: "/api/items/:itemId",
          reason: "Dynamic parameter could not be resolved for /api/items/:itemId.",
          testedAt: new Date(0).toISOString(),
        },
      ],
    };
  }

  it("renders summary + per-result tones", () => {
    const lines = toTestLines(session());
    const byText = new Map(lines.map((line) => [line.text, line.tone]));
    assert.equal(byText.get("Tested 3: 1 passed · 1 failed · 1 skipped"), "green");
    const pass = lines.find((line) => line.text.includes("GET") && line.text.includes("(200)"));
    const fail = lines.find((line) => line.text.includes("(500)"));
    const skip = lines.find((line) => line.text.includes("SKIPPED"));
    assert.equal(pass?.tone, "green");
    assert.equal(fail?.tone, "red");
    assert.equal(skip?.tone, "yellow");
  });

  it("never leaks secrets into transcript lines", () => {
    const text = toTestLines(session()).map((line) => line.text).join("\n");
    // Note: the `auth:bearer` label is fine — only real secret values must not appear.
    assert.doesNotMatch(text, /preset-token|admin123|Authorization:/i);
  });

  it("prints an empty-state line when there are no results", () => {
    const lines = toTestLines({ ...session(), results: [] });
    assert.deepEqual(
      lines.map((line) => line.text),
      ["No endpoints found."],
    );
    assert.equal(lines[0].tone, "yellow");
  });

  it("drops the template line even when path differs from resolvedPath", () => {
    const lines = toTestLines({
      ...session(),
      results: [
        {
          kind: "executed",
          order: 1,
          method: "GET",
          path: "/api/lahan/:lahanId",
          resolvedPath: "/api/lahan/0f50625c-ced6-4aa9-9931-551cdfa4b63f",
          statusCode: 200,
          success: true,
          latencyMs: 8,
          auth: "bearer",
          aiGenerated: false,
          testedAt: new Date(0).toISOString(),
        },
      ],
    });
    const text = lines.map((line) => line.text).join("\n");
    assert.doesNotMatch(text, /template:/);
    assert.match(text, /\/api\/lahan\/0f50625c-ced6-4aa9-9931-551cdfa4b63f/);
  });

  it("renders payload and response as labeled blocks with breaks", () => {
    const body = ["{", '  "success": true,', '  "message": "ok",', '  "data": {', '    "id": "1",', "  },", '  "extra": 1,', '  "more": 2,', '  "tail": 3', "}"].join("\n");
    const lines = toTestLines({
      ...session(),
      results: [
        {
          kind: "executed",
          order: 1,
          method: "POST",
          path: "/api/items",
          resolvedPath: "/api/items",
          statusCode: 201,
          success: true,
          latencyMs: 91,
          auth: "bearer",
          aiGenerated: false,
          testedAt: new Date(0).toISOString(),
          payload: { a: 1 },
          responsePreview: body,
        },
      ],
    });
    const texts = lines.map((line) => line.text);
    // Block labels appear exactly once each.
    assert.equal(texts.filter((t) => t === "Payload:").length, 1);
    assert.equal(texts.filter((t) => t === "Response:").length, 1);
    // No per-line "payload:" prefix.
    assert.ok(!texts.some((t) => t.includes("payload:")));
    // Breaks: blank line before each label.
    assert.equal(texts[texts.indexOf("Payload:") - 1], "");
    assert.equal(texts[texts.indexOf("Response:") - 1], "");
    // Bodies kept raw with truncation marker.
    assert.ok(texts.includes("{"));
    assert.ok(texts.includes('  "success": true,'));
    assert.ok(texts.includes("… (truncated)"));
  });
});

describe("runTest AUTH gate", () => {
  it("blocks without credentials and points at /config (no network)", async () => {
    const root = fixture();
    const lines = await runTest(root, ["GET"]);
    const text = lines.map((line) => line.text).join("\n");
    assert.match(text, /Not configured/);
    assert.match(text, /\/config/);
  });
});

describe("runTest e2e (local http)", () => {
  it("runs bulk GET: collection sampled for the :itemId endpoint", async () => {
    const root = fixture();
    const seen: string[] = [];
    const { server, port: getPort, close } = listen((req, res) => {
      seen.push(`${req.method} ${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url === "/") return res.end(JSON.stringify({ ok: true }));
      if (req.url === "/api/items/") return res.end(JSON.stringify({ data: [{ id: "item-1" }] }));
      return res.end(JSON.stringify({ data: { id: "item-1" } }));
    });
    try {
      const port = await getPort();
      saveCredentials(root, credentials(`http://127.0.0.1:${port}`));
      const lines = await runTest(root, ["GET"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /2 passed/);
      assert.ok(seen.includes("GET /api/items/item-1"), `seen: ${seen.join(", ")}`);
      assert.doesNotMatch(text, /preset-token|admin123|Authorization:/i);
    } finally {
      await close();
    }
  });

  it("skips the :itemId endpoint honestly when nothing can be sampled", async () => {
    const root = fixture();
    const { server, port: getPort, close } = listen((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url === "/") return res.end(JSON.stringify({ ok: true }));
      return res.end(JSON.stringify({ data: [] }));
    });
    try {
      const port = await getPort();
      saveCredentials(root, credentials(`http://127.0.0.1:${port}`));
      const lines = await runTest(root, ["GET"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /1 skipped/);
      assert.match(text, /concrete id/);
    } finally {
      await close();
    }
  });

  it("runs a single endpoint by concrete id without sampling", async () => {
    const root = fixture();
    const seen: string[] = [];
    const { server, port: getPort, close } = listen((req, res) => {
      seen.push(`${req.method} ${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url === "/") return res.end(JSON.stringify({ ok: true }));
      return res.end(JSON.stringify({ data: { id: "item-42" } }));
    });
    try {
      const port = await getPort();
      saveCredentials(root, credentials(`http://127.0.0.1:${port}`));
      const lines = await runTest(root, ["GET", "/api/items/item-42"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /1 passed/);
      assert.ok(seen.includes("GET /api/items/item-42"), `seen: ${seen.join(", ")}`);
      assert.ok(!seen.includes("GET /api/items/"));
    } finally {
      await close();
    }
  });

  it("reports unknown endpoints with available targets", async () => {
    const root = fixture();
    saveCredentials(root, credentials("http://127.0.0.1:1"));
    const lines = await runTest(root, ["POST", "/api/nope"]);
    const text = lines.map((line) => line.text).join("\n");
    assert.match(text, /Endpoint not found/);
  });
});
