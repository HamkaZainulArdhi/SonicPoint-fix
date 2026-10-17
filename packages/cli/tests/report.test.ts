import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TestSession } from "../src/domain/session.js";
import { publishSession } from "../src/report/publish.js";
import { ReportStore } from "../src/report/store.js";
import { executedResult, sampleSession, skippedResult } from "./helpers/fixtures.js";

function session(): TestSession {
  return sampleSession({
    project: { slug: "demo", name: "Demo" },
    results: [executedResult(), skippedResult()],
  });
}

function mockStore(): ReportStore & { calls: string[]; rows?: unknown[] } {
  const store = {
    calls: [] as string[],
    rows: undefined as unknown[] | undefined,
    name: "mock",
    async upsertProject() {
      store.calls.push("upsertProject");
      return { id: "project-1" };
    },
    async openSession() {
      store.calls.push("openSession");
      return { id: "session-1" };
    },
    async appendResults(_project: string, _session: string, results: unknown[]) {
      store.calls.push("appendResults");
      store.rows = results;
      return results.length;
    },
    async closeSession() {
      store.calls.push("closeSession");
    },
    reportUrl(id: string) {
      return `https://reports.example.test/report/${id}`;
    },
  };

  return store;
}

describe("publishSession", () => {
  it("writes project → session → results → close in order", async () => {
    const store = mockStore();
    const outcome = await publishSession(session(), store);

    assert.equal(outcome.status, "published");
    assert.deepEqual(store.calls, ["upsertProject", "openSession", "appendResults", "closeSession"]);
    assert.equal(store.rows?.length, 2);

    if (outcome.status === "published") {
      assert.equal(outcome.receipt.sessionId, "session-1");
      assert.equal(outcome.receipt.reportUrl, "https://reports.example.test/report/session-1");
    }
  });

  it("filters by method and path", async () => {
    const store = mockStore();
    const outcome = await publishSession(session(), store, { method: "POST", path: "/api/items" });

    assert.equal(outcome.status, "published");
    assert.equal(store.rows?.length, 1);
  });

  it("skips when nothing matches", async () => {
    const outcome = await publishSession(session(), mockStore(), { method: "DELETE" });

    assert.equal(outcome.status, "skipped");
  });

  it("skips without a store", async () => {
    const outcome = await publishSession(session(), null);

    assert.equal(outcome.status, "skipped");
  });

  it("fails cleanly on store errors", async () => {
    const store = mockStore();
    store.upsertProject = async () => {
      throw new Error("db down");
    };

    const outcome = await publishSession(session(), store);

    assert.equal(outcome.status, "failed");
    if (outcome.status === "failed") {
      assert.match(outcome.reason, /db down/);
    }
  });
});
