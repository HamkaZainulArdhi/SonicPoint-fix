import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { saveCredentials } from "../src/config/app.js";
import { SessionStore } from "../src/config/sessions.js";
import { scanEndpoints } from "../src/scan/routes/scanEndpoints.js";
import { runSession } from "../src/run/runner.js";
import { summarize } from "../src/domain/session.js";
import { tmpDir, tmpProject } from "./helpers/project.js";
import { hits, startServer } from "./helpers/server.js";
import { credentials } from "./helpers/fixtures.js";

const ITEMS_PROJECT = {
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
    export default router;
  `,
};

describe("runSession", () => {
  it("logs in once and runs GET endpoints", async () => {
    const root = tmpProject("send", ITEMS_PROJECT);
    const server = await startServer((request) =>
      request.url === "/api/auth/login"
        ? { body: { data: { token: "session-token" } } }
        : { body: { data: [{ id: "item-1" }] } },
    );

    try {
      saveCredentials(root, credentials(server.url));

      const endpoints = scanEndpoints(root);
      const session = await runSession(endpoints, {
        rootDir: root,
        allEndpoints: endpoints,
        credentials: credentials(server.url),
        ai: null,
        store: new SessionStore(root),
      });

      const seen = server.requests.map((request) => `${request.method} ${request.url}`);

      assert.equal(hits(server, "POST", "/api/auth/login").length, 1);
      assert.ok(seen.includes("GET /api/items/"));
      assert.ok(seen.includes("GET /api/items/item-1"));
      assert.equal(summarize(session).passed, 2);

      const saved = JSON.parse(fs.readFileSync(path.join(root, ".sonic-point.json"), "utf-8")) as {
        token?: string;
      };
      assert.equal(saved.token, "session-token");
    } finally {
      await server.close();
    }
  });

  it("skips unresolvable dynamic GETs without prompting", async () => {
    const root = tmpProject("send", ITEMS_PROJECT);
    const server = await startServer(() => ({ body: { data: [] } }));

    try {
      const endpoints = scanEndpoints(root);
      let prompts = 0;

      const session = await runSession(endpoints, {
        rootDir: root,
        allEndpoints: endpoints,
        credentials: credentials(server.url, true),
        ai: null,
        prompter: {
          askParam: async () => {
            prompts += 1;
            return null;
          },
        },
      });

      const seen = server.requests.map((request) => `${request.method} ${request.url}`);

      assert.equal(prompts, 0);
      assert.equal(summarize(session).skipped, 1);
      assert.ok(seen.includes("GET /api/items/"));
      assert.ok(!seen.some((entry) => entry.includes(":")));
    } finally {
      await server.close();
    }
  });

  it("rejects empty target lists", async () => {
    await assert.rejects(
      () =>
        runSession([], {
          rootDir: tmpDir("send-empty"),
          allEndpoints: [],
          credentials: credentials("http://127.0.0.1:1", true),
          ai: null,
        }),
      /No endpoints selected/,
    );
  });
});
