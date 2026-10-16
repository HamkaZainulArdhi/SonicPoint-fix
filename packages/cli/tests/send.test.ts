import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { saveCredentials } from "../src/config/app.js";
import { SessionStore } from "../src/config/sessions.js";
import { scanEndpoints } from "../src/scan/routes/scanEndpoints.js";
import { runSession } from "../src/run/runner.js";
import { summarize } from "../src/domain/session.js";

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-send-"));
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
    export default router;
    `.trimStart(),
  );
  return root;
}

function credentials(baseUrl: string, withToken: boolean) {
  return {
    baseUrl,
    loginEndpoint: "/api/auth/login",
    email: "admin@example.com",
    password: "admin123",
    tokenField: "data.token",
    ...(withToken ? { token: "preset-token" } : {}),
  };
}

describe("runSession", () => {
  it("logs in once and runs GET endpoints", async () => {
    const root = fixture();
    const seen: string[] = [];
    let logins = 0;

    const server = http.createServer((req, res) => {
      if (req.url === "/api/auth/login") {
        logins += 1;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: { token: "session-token" } }));
        return;
      }

      seen.push(`${req.method} ${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "item-1" }] }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      saveCredentials(root, credentials(`http://127.0.0.1:${port}`, false));

      const endpoints = scanEndpoints(root);
      const session = await runSession(endpoints, {
        rootDir: root,
        allEndpoints: endpoints,
        credentials: credentials(`http://127.0.0.1:${port}`, false),
        ai: null,
        store: new SessionStore(root),
      });

      assert.equal(logins, 1);
      assert.ok(seen.includes("GET /api/items/"));
      assert.ok(seen.includes("GET /api/items/item-1"));
      assert.equal(summarize(session).passed, 2);

      const saved = JSON.parse(
        fs.readFileSync(path.join(root, ".sonic-point.json"), "utf-8"),
      ) as { token?: string };
      assert.equal(saved.token, "session-token");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("skips unresolvable dynamic GETs without prompting", async () => {
    const root = fixture();
    const seen: string[] = [];

    const server = http.createServer((req, res) => {
      seen.push(`${req.method} ${req.url}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [] }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const endpoints = scanEndpoints(root);
      let prompts = 0;

      const session = await runSession(endpoints, {
        rootDir: root,
        allEndpoints: endpoints,
        credentials: credentials(`http://127.0.0.1:${port}`, true),
        ai: null,
        prompter: {
          askParam: async () => {
            prompts += 1;
            return null;
          },
        },
      });

      assert.equal(prompts, 0);
      assert.equal(summarize(session).skipped, 1);
      assert.ok(seen.includes("GET /api/items/"));
      assert.ok(!seen.some((entry) => entry.includes(":itemId")));
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("rejects empty target lists", async () => {
    await assert.rejects(
      () =>
        runSession([], {
          rootDir: os.tmpdir(),
          allEndpoints: [],
          credentials: credentials("http://127.0.0.1:1", true),
          ai: null,
        }),
      /No endpoints selected/,
    );
  });
});
