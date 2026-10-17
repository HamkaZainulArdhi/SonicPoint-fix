// End-to-end for foreign-key bodies: POST /api/orders requires an `itemId`
// that must exist in the user's own database, so it is sampled from
// GET /api/items instead of invented by the AI.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { saveCredentials } from "../src/config/app.js";
import { SessionStore } from "../src/config/sessions.js";
import { scanEndpoints } from "../src/scan/routes/scanEndpoints.js";
import { runSession } from "../src/run/runner.js";
import { summarize } from "../src/domain/session.js";
import { tmpProject } from "./helpers/project.js";
import { bodies, hits, startServer } from "./helpers/server.js";
import { credentials } from "./helpers/fixtures.js";

const ORDERS_PROJECT = {
  "package.json": JSON.stringify({ name: "orders-fixture" }),
  "src/app.js": `
    import express from "express";
    import itemRoutes from "./routes/itemRoutes.js";
    import orderRoutes from "./routes/orderRoutes.js";
    const app = express();
    app.use("/api/items", itemRoutes);
    app.use("/api/orders", orderRoutes);
    export default app;
  `,
  "src/routes/itemRoutes.js": `
    import express from "express";
    import { createItemSchema } from "../validators/schemas.js";
    const router = express.Router();
    router.get("/", async () => {});
    router.post("/", validate(createItemSchema), async () => {});
    export default router;
  `,
  "src/routes/orderRoutes.js": `
    import express from "express";
    import { createOrderSchema } from "../validators/schemas.js";
    const router = express.Router();
    router.post("/", validate(createOrderSchema), async () => {});
    export default router;
  `,
  "src/validators/schemas.js": `
    import Joi from "joi";
    export const createItemSchema = Joi.object({ title: Joi.string().required() });
    export const createOrderSchema = Joi.object({
      itemId: Joi.string().required(),
      title: Joi.string().required(),
    });
  `,
};

interface StoredRef {
  id: string;
  host: string;
  source: string;
  stale?: boolean;
}

function readRefs(root: string): Record<string, StoredRef> {
  const saved = JSON.parse(fs.readFileSync(path.join(root, ".sonic-point.json"), "utf-8")) as {
    refs?: Record<string, StoredRef>;
  };
  return saved.refs ?? {};
}

describe("reference ids (foreign keys)", () => {
  it("caches a sampled id, reuses it, then self-heals when it goes stale", async () => {
    const root = tmpProject("refs", ORDERS_PROJECT);
    const sampled: Array<{ noun: string; id: string; previous?: string }> = [];
    let itemRows = [{ id: "item-1" }];
    let orderResponse = { status: 201, body: { success: true } as unknown };

    const server = await startServer((request) => {
      if (request.url === "/api/auth/login") return { body: { data: { token: "session-token" } } };
      if (request.method === "GET") return { body: { data: itemRows } };
      if (request.method === "POST") return orderResponse;
      return { status: 404, body: { success: false, message: "Not found" } };
    });

    try {
      const endpoints = scanEndpoints(root);
      const target = endpoints.find((endpoint) => endpoint.method === "POST" && endpoint.path === "/api/orders/");
      assert.ok(target, "POST /api/orders/ must be scanned");

      const creds = credentials(server.url, true);
      saveCredentials(root, creds);

      const run = () =>
        runSession([target], {
          rootDir: root,
          allEndpoints: endpoints,
          credentials: creds,
          ai: null,
          store: new SessionStore(root),
          events: { refSampled: (ref) => sampled.push(ref) },
        });

      // Run 1 — no cache yet: the id is sampled, pinned into the body, written once.
      const first = await run();
      assert.equal(summarize(first).passed, 1);
      assert.equal(bodies(server, "POST", "/api/orders")[0]?.itemId, "item-1");
      assert.equal(hits(server, "GET", "/api/items").length, 1);

      const stored = readRefs(root).item;
      assert.equal(stored.id, "item-1");
      assert.equal(stored.host, server.url);
      assert.equal(stored.source, "GET /api/items");
      assert.equal(stored.stale, undefined);

      // Run 2 — cache hit: the collection is not sampled again.
      const second = await run();
      assert.equal(summarize(second).passed, 1);
      assert.equal(bodies(server, "POST", "/api/orders")[1]?.itemId, "item-1");
      assert.equal(hits(server, "GET", "/api/items").length, 1, "a cached id must not trigger another GET");

      // Run 3 — the row is gone: the failure is reported and the cached id goes stale.
      orderResponse = { status: 404, body: { success: false, message: "Item not found" } };
      const third = await run();
      assert.equal(summarize(third).failed, 1);
      assert.equal(hits(server, "GET", "/api/items").length, 1, "a stale mark comes from the cached value");
      assert.equal(readRefs(root).item.stale, true);

      // Run 4 — stale refs are resampled before the request, and the new id is used.
      itemRows = [{ id: "item-2" }];
      orderResponse = { status: 201, body: { success: true } };
      const fourth = await run();
      assert.equal(summarize(fourth).passed, 1);
      assert.equal(bodies(server, "POST", "/api/orders").at(-1)?.itemId, "item-2");
      assert.equal(readRefs(root).item.stale, undefined, "a successful refresh clears the flag");

      // Run 5 — a "not found" body is caught even without a 404 status.
      orderResponse = { status: 422, body: { message: "Item not found" } };
      const fifth = await run();
      assert.equal(summarize(fifth).failed, 1);
      assert.equal(readRefs(root).item.stale, true);

      assert.deepEqual(sampled, [
        { noun: "item", id: "item-1" },
        { noun: "item", id: "item-2", previous: "item-1" },
      ]);
    } finally {
      await server.close();
    }
  });
});
