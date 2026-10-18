// mergeSessions + MergingSessionStore — the REPL working session that
// accumulates across `/test` runs purely in memory (no cache file).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeSessions } from "../src/domain/session.js";
import { MergingSessionStore } from "../src/config/sessions.js";
import { executedResult, sampleSession, skippedResult } from "./helpers/fixtures.js";

describe("mergeSessions", () => {
  it("returns the incoming session untouched without a previous one", () => {
    const next = sampleSession({ results: [executedResult()] });
    assert.deepEqual(mergeSessions(undefined, next), next);
  });

  it("appends new endpoints after the previous results and renumbers order", () => {
    const previous = sampleSession({
      results: [executedResult({ order: 9, method: "GET", path: "/api/items" })],
    });
    const next = sampleSession({
      results: [
        executedResult({ order: 1, method: "GET", path: "/api/orders" }),
        executedResult({ order: 2, method: "POST", path: "/api/orders" }),
      ],
    });

    const merged = mergeSessions(previous, next);

    assert.deepEqual(
      merged.results.map((result) => `${result.method} ${result.path}`),
      ["GET /api/items", "GET /api/orders", "POST /api/orders"],
    );
    assert.deepEqual(merged.results.map((result) => result.order), [1, 2, 3]);
  });

  it("replaces a re-tested endpoint in place (latest result wins)", () => {
    const previous = sampleSession({
      results: [
        executedResult({ order: 1, method: "GET", path: "/api/items", latencyMs: 5 }),
        executedResult({ order: 2, method: "GET", path: "/api/orders", latencyMs: 6 }),
      ],
    });
    const next = sampleSession({
      results: [
        executedResult({
          order: 1,
          method: "GET",
          path: "/api/items",
          latencyMs: 99,
          statusCode: 500,
          success: false,
        }),
      ],
    });

    const merged = mergeSessions(previous, next);

    assert.equal(merged.results.length, 2);
    assert.deepEqual(merged.results.map((result) => result.order), [1, 2]);
    const item = merged.results[0];
    assert.equal(item.kind, "executed");
    if (item.kind === "executed") {
      assert.equal(item.latencyMs, 99);
      assert.equal(item.success, false);
    }
    assert.equal(merged.results[1].path, "/api/orders");
  });

  it("replaces skipped ↔ executed in both directions", () => {
    const skippedOnly = sampleSession({
      results: [skippedResult({ method: "POST", path: "/api/items" })],
    });

    const executed = mergeSessions(
      skippedOnly,
      sampleSession({ results: [executedResult({ method: "POST", path: "/api/items" })] }),
    );
    assert.equal(executed.results.length, 1);
    assert.equal(executed.results[0].kind, "executed");

    const skipped = mergeSessions(
      sampleSession({ results: [executedResult({ method: "POST", path: "/api/items" })] }),
      skippedOnly,
    );
    assert.equal(skipped.results.length, 1);
    assert.equal(skipped.results[0].kind, "skipped");
  });

  it("keeps method+path pairs distinct", () => {
    const merged = mergeSessions(
      sampleSession({ results: [executedResult({ method: "GET", path: "/api/items" })] }),
      sampleSession({ results: [executedResult({ method: "DELETE", path: "/api/items" })] }),
    );

    assert.deepEqual(
      merged.results.map((result) => `${result.method} ${result.path}`),
      ["GET /api/items", "DELETE /api/items"],
    );
  });

  it("unions the time window and keeps the latest project", () => {
    const previous = sampleSession({
      project: { slug: "old", name: "old" },
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:05.000Z",
      results: [executedResult()],
    });
    const next = sampleSession({
      project: { slug: "new", name: "new" },
      startedAt: "2026-01-01T00:00:07.000Z",
      finishedAt: "2026-01-01T00:00:09.000Z",
      results: [executedResult({ method: "POST", path: "/api/orders" })],
    });

    const merged = mergeSessions(previous, next);

    assert.equal(merged.startedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(merged.finishedAt, "2026-01-01T00:00:09.000Z");
    assert.deepEqual(merged.project, { slug: "new", name: "new" });
  });

  it("stays correct when the incoming window is older than the previous one", () => {
    const merged = mergeSessions(
      sampleSession({ startedAt: "2026-01-01T00:00:10.000Z", finishedAt: "2026-01-01T00:00:11.000Z" }),
      sampleSession({ startedAt: "2026-01-01T00:00:00.000Z", finishedAt: "2026-01-01T00:00:01.000Z" }),
    );

    assert.equal(merged.startedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(merged.finishedAt, "2026-01-01T00:00:11.000Z");
  });
});

describe("MergingSessionStore", () => {
  it("accumulates saves in memory (append + replace)", () => {
    const store = new MergingSessionStore();

    store.save(sampleSession({ results: [executedResult({ method: "GET", path: "/api/items", latencyMs: 5 })] }));
    store.save(sampleSession({ results: [executedResult({ method: "GET", path: "/api/orders", latencyMs: 7 })] }));
    store.save(sampleSession({ results: [executedResult({ method: "GET", path: "/api/items", latencyMs: 42 })] }));

    const session = store.load();
    assert.ok(session);
    assert.deepEqual(session.results.map((result) => result.path), ["/api/items", "/api/orders"]);
    assert.deepEqual(session.results.map((result) => result.order), [1, 2]);
    const item = session.results[0];
    assert.equal(item.kind, "executed");
    if (item.kind === "executed") assert.equal(item.latencyMs, 42);
  });
});
