import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RefEntry } from "../src/domain/ref.js";
import { SchemaDefinition } from "../src/domain/schema.js";
import { collectionCandidates, referenceNoun } from "../src/run/resources.js";
import { RefResolver, normalizeHost, refFields, refNotice } from "../src/run/refs.js";
import { endpoint } from "./helpers/fixtures.js";

const HOST = "http://localhost:3000";

const ENDPOINTS = [
  endpoint("GET", "/api/items"),
  endpoint("POST", "/api/items"),
  endpoint("GET", "/api/items/:itemId"),
  endpoint("POST", "/api/orders"),
  endpoint("GET", "/api/users"),
];

function schemaWith(...names: string[]): SchemaDefinition {
  return {
    name: "createOrderSchema",
    framework: "joi",
    filePath: "src/validators/orders.js",
    properties: names.map((name) => ({ name, type: "string", required: true })),
  };
}

function stored(id: string, options: { host?: string; stale?: boolean } = {}): RefEntry {
  return {
    id,
    source: "GET /api/items",
    host: options.host ?? HOST,
    capturedAt: "2026-01-01T00:00:00.000Z",
    ...(options.stale ? { stale: true } : {}),
  };
}

/** Fake fetch: records URLs and answers with `answer(url)` as JSON. */
function recordingFetch(answer: (url: string) => unknown): {
  fetchImpl: typeof fetch;
  calls: string[];
} {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    return new Response(JSON.stringify(answer(url)), { status: 200 });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

function resolver(options: {
  refs?: Record<string, RefEntry>;
  fetchImpl: typeof fetch;
  onSampled?: (ref: { noun: string; id: string; previous?: string }) => void;
}): RefResolver {
  return new RefResolver({
    refs: options.refs ?? {},
    host: HOST,
    endpoints: ENDPOINTS,
    baseUrl: HOST,
    token: "token",
    fetchImpl: options.fetchImpl,
    onSampled: options.onSampled,
  });
}

describe("reference fields", () => {
  it("reads a noun out of foreign-key field names", () => {
    const cases: Array<[string, string | null]> = [
      ["itemId", "item"],
      ["item_id", "item"],
      ["id_item", "item"],
      ["userId", "user"],
      ["userID", "user"],
      ["plantAnalysisId", "plant-analysis"],
      ["itemUuid", "item"],
      ["id", null],
      ["uuid", null],
      ["item_name", null],
      ["description", null],
    ];

    for (const [field, expected] of cases) {
      assert.equal(referenceNoun(field), expected, field);
    }
  });

  it("lists the reference fields of a schema", () => {
    assert.deepEqual(refFields(schemaWith("itemId", "title", "user_id")), [
      { field: "itemId", noun: "item" },
      { field: "user_id", noun: "user" },
    ]);
  });

  it("ranks static GET collections and ignores parameterized routes", () => {
    assert.deepEqual(collectionCandidates("item", ENDPOINTS), ["/api/items"]);
    assert.deepEqual(collectionCandidates("user", ENDPOINTS), ["/api/users"], "plural collection");
    assert.deepEqual(collectionCandidates("order", ENDPOINTS), [], "no GET collection to sample");
  });

  it("normalizes the host key", () => {
    assert.equal(normalizeHost("HTTP://Localhost:3000/"), "http://localhost:3000");
  });
});

describe("RefResolver", () => {
  it("uses the cached id without touching the network", async () => {
    const { fetchImpl, calls } = recordingFetch(() => ({ data: [{ id: "never-used" }] }));
    const refs = resolver({ refs: { item: stored("item-1") }, fetchImpl });

    assert.deepEqual(await refs.resolve("item"), { value: "item-1", fromCache: true });
    assert.equal(calls.length, 0);
    assert.equal(refs.dirty, false);
  });

  it("samples once when the cache belongs to another host", async () => {
    const { fetchImpl, calls } = recordingFetch(() => ({ data: [{ item_id: "item-9" }] }));
    const sampled: Array<{ noun: string; previous?: string }> = [];
    const refs = resolver({
      refs: { item: stored("other-env-id", { host: "http://staging.example.com" }) },
      fetchImpl,
      onSampled: (ref) => sampled.push(ref),
    });

    const first = await refs.resolve("item");
    const second = await refs.resolve("item");

    assert.deepEqual(first, { value: "item-9", fromCache: false });
    assert.deepEqual(second, first, "one sample per run, then memoized");
    assert.equal(calls.length, 1);
    assert.equal(sampled.length, 1);
    assert.equal(sampled[0].previous, undefined, "another env's id is not a refresh");

    const entry = refs.snapshot().item;
    assert.equal(entry.id, "item-9");
    assert.equal(entry.host, HOST);
    assert.equal(entry.source, "GET /api/items");
    assert.equal(refs.dirty, true);
  });

  it("resamples a stale entry and reports the previous id", async () => {
    const { fetchImpl, calls } = recordingFetch(() => ({ data: [{ id: "item-2" }] }));
    const sampled: Array<{ noun: string; id: string; previous?: string }> = [];
    const refs = resolver({
      refs: { item: stored("item-1", { stale: true }) },
      fetchImpl,
      onSampled: (ref) => sampled.push(ref),
    });

    assert.deepEqual(await refs.resolve("item"), { value: "item-2", fromCache: false });
    assert.equal(calls.length, 1);
    assert.deepEqual(sampled, [{ noun: "item", id: "item-2", previous: "item-1" }]);
    assert.equal(refs.snapshot().item.stale, undefined, "refresh clears the stale flag");
  });

  it("keeps the cached id when sampling comes up empty", async () => {
    const { fetchImpl } = recordingFetch(() => ({ data: [] }));
    const refs = resolver({ refs: { item: stored("item-1", { stale: true }) }, fetchImpl });

    assert.deepEqual(await refs.resolve("item"), { value: "item-1", fromCache: true });
    assert.equal(refs.snapshot().item.stale, true, "still stale for the next run");
    assert.equal(refs.dirty, false, "nothing new to write");
  });

  it("returns null when there is no cache and no collection", async () => {
    const { fetchImpl, calls } = recordingFetch(() => ({ data: [{ id: "x" }] }));
    const refs = resolver({ fetchImpl });

    assert.deepEqual(await refs.resolve("unknown-noun"), { value: null, fromCache: false });
    assert.equal(calls.length, 0);
  });

  it("marks a cached id stale once", () => {
    const { fetchImpl } = recordingFetch(() => ({ data: [] }));
    const refs = resolver({ refs: { item: stored("item-1") }, fetchImpl });

    refs.markStale("item");
    assert.equal(refs.snapshot().item.stale, true);
    assert.equal(refs.dirty, true);

    refs.markStale("item");
    assert.equal(refs.snapshot().item.stale, true);
  });

  it("describes captures and refreshes for the transcript", () => {
    assert.equal(refNotice({ noun: "item", id: "item-1" }), "↳ refs.item = item-1 (saved)");
    assert.equal(
      refNotice({ noun: "item", id: "item-2", previous: "item-1" }),
      "↳ refs.item was stale — refreshed to item-2",
    );
  });
});
