import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { saveCredentials } from "../src/config/app.js";
import { SessionStore } from "../src/config/sessions.js";
import { runReport, runTest } from "../src/tui/repl/dispatchCommands.js";
import {
  concreteParamsForTemplate,
  parseTestArgs,
} from "../src/tui/repl/testArgs.js";
import { toTestLines } from "../src/tui/views/testView.js";
import { TestSession } from "../src/domain/session.js";
import { tmpDir, tmpProject } from "./helpers/project.js";
import { hits, startServer } from "./helpers/server.js";
import {
  credentials,
  executedResult,
  sampleSession,
  skippedResult,
} from "./helpers/fixtures.js";

function fixture(): string {
  return tmpProject("tui-test", {
    "src/app.js": `
      import express from "express";
      import itemRoutes from "./routes/itemRoutes.js";
      const app = express();
      app.use("/api/items", itemRoutes);
      export default app;
    `,
    "src/routes/itemRoutes.js": `
      import express from "express";
      const router = express.Router();
      router.get("/", async () => {});
      router.get("/:itemId", async () => {});
      router.post("/", async () => {});
      export default router;
    `,
  });
}

function session(): TestSession {
  return sampleSession({
    results: [
      executedResult({ order: 1, latencyMs: 12 }),
      executedResult({
        order: 2,
        method: "POST",
        statusCode: 500,
        success: false,
        latencyMs: 30,
        error: "boom",
      }),
      skippedResult({
        order: 3,
        method: "GET",
        path: "/api/items/:itemId",
        resolvedPath: "/api/items/:itemId",
        reason: "Dynamic parameter could not be resolved for /api/items/:itemId.",
      }),
    ],
  });
}

describe("parseTestArgs (strict, method required)", () => {
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
    const parsed = parseTestArgs(["post", "/api/items/"]);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.filter, { kind: "single", method: "POST", path: "/api/items" });
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
    const lines = toTestLines(sampleSession({ results: [] }));
    assert.deepEqual(
      lines.map((line) => line.text),
      ["No endpoints found."],
    );
    assert.equal(lines[0].tone, "yellow");
  });

  it("drops the template line even when path differs from resolvedPath", () => {
    const lines = toTestLines(
      sampleSession({
        results: [
          executedResult({
            resolvedPath: "/api/items/0f50625c-ced6-4aa9-9931-551cdfa4b63f",
          }),
        ],
      }),
    );
    const text = lines.map((line) => line.text).join("\n");
    assert.doesNotMatch(text, /template:/);
    assert.match(text, /\/api\/items\/0f50625c-ced6-4aa9-9931-551cdfa4b63f/);
  });

  it("renders payload and response as labeled blocks with breaks", () => {
    const body = ["{", '  "success": true,', '  "message": "ok",', '  "data": {', '    "id": "1",', "  },", '  "extra": 1,', '  "more": 2,', '  "tail": 3', "}"].join("\n");
    const lines = toTestLines(
      sampleSession({
        results: [
          executedResult({
            method: "POST",
            statusCode: 201,
            latencyMs: 91,
            payload: { a: 1 },
            responsePreview: body,
          }),
        ],
      }),
    );
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
    const server = await startServer((request) => {
      if (request.url === "/api/items/") return { body: { data: [{ id: "item-1" }] } };
      return { body: { data: { id: "item-1" } } };
    });

    try {
      saveCredentials(root, credentials(server.url, true));
      const lines = await runTest(root, ["GET"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /2 passed/);
      assert.equal(hits(server, "GET", "/api/items/item-1").length, 1);
      assert.doesNotMatch(text, /preset-token|admin123|Authorization:/i);
    } finally {
      await server.close();
    }
  });

  it("skips the :itemId endpoint honestly when nothing can be sampled", async () => {
    const root = fixture();
    const server = await startServer(() => ({ body: { data: [] } }));

    try {
      saveCredentials(root, credentials(server.url, true));
      const lines = await runTest(root, ["GET"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /1 skipped/);
      assert.match(text, /concrete id/);
    } finally {
      await server.close();
    }
  });

  it("runs a single endpoint by concrete id without sampling", async () => {
    const root = fixture();
    const server = await startServer(() => ({ body: { data: { id: "item-42" } } }));

    try {
      saveCredentials(root, credentials(server.url, true));
      const lines = await runTest(root, ["GET", "/api/items/item-42"]);
      const text = lines.map((line) => line.text).join("\n");
      assert.match(text, /1 passed/);
      assert.equal(hits(server, "GET", "/api/items/item-42").length, 1);
      assert.equal(hits(server, "GET", "/api/items").length, 0, "no collection sampling for a concrete id");
    } finally {
      await server.close();
    }
  });

  it("reports unknown endpoints with available targets", async () => {
    const root = fixture();
    saveCredentials(root, credentials("http://127.0.0.1:1", true));
    const lines = await runTest(root, ["POST", "/api/nope"]);
    const text = lines.map((line) => line.text).join("\n");
    assert.match(text, /Endpoint not found/);
  });
});

describe("runReport (in-TUI publish)", () => {
  it("asks to run /test first when nothing is cached", async () => {
    const root = tmpDir("tui-report");
    const lines = await runReport(root, []);
    assert.match(lines.map((line) => line.text).join("\n"), /No cached session/);
    assert.equal(lines[0].tone, "red");
  });

  it("publishes via the platform and prints the report link", async () => {
    const root = tmpDir("tui-report");
    new SessionStore(root).save(sampleSession());
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({
        status: "published",
        receipt: { sessionId: "s1", published: 1, reportUrl: "https://sonicpoint.vercel.app/report/s1" },
      }),
    })) as unknown as typeof fetch;
    const lines = await runReport(root, [], { fetchImpl: fakeFetch });
    const text = lines.map((line) => line.text).join("\n");
    assert.match(text, /Published 1 endpoints/);
    assert.match(text, /sonicpoint\.vercel\.app\/report\/s1/);
  });

  it("forwards method+path filters and rejects bad args without network", async () => {
    const root = tmpDir("tui-report");
    new SessionStore(root).save(sampleSession());
    let seenBody = "";
    const fakeFetch = (async (_url: string, init?: { body?: string }) => {
      seenBody = String(init?.body ?? "");
      return { ok: true, json: async () => ({ status: "skipped", reason: "nothing matched" }) };
    }) as unknown as typeof fetch;
    await runReport(root, ["GET", "/api/items"], { fetchImpl: fakeFetch });
    assert.match(seenBody, /"method":"GET"/);
    assert.match(seenBody, /"path":"\/api\/items"/);

    const noNetwork = (async (): Promise<never> => {
      throw new Error("must not hit network on bad args");
    }) as unknown as typeof fetch;
    const bad = await runReport(root, ["FOO"], { fetchImpl: noNetwork });
    assert.match(bad.map((line) => line.text).join("\n"), /Unknown \/report filter/);
    const many = await runReport(root, ["GET", "/a", "/b"], { fetchImpl: noNetwork });
    assert.match(many.map((line) => line.text).join("\n"), /Too many arguments/);
  });
});
