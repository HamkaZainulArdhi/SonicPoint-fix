import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scanEndpoints, ScanError } from "../src/scan/routes/scanEndpoints.js";
import { tmpProject } from "./helpers/project.js";

const APP = `
  import express from "express";
  import itemRoutes from "./routes/items.js";
  const app = express();
  app.use("/api/items", itemRoutes);
  export default app;
`;

describe("scanEndpoints", () => {
  it("resolves nested prefixes across files", () => {
    const root = tmpProject("scan", {
      "src/app.js": APP,
      "src/routes/items.js": `
        import express from "express";
        const router = express.Router();
        router.get("/", async () => {});
        router.post("/", async () => {});
        export default router;
      `,
    });

    const paths = scanEndpoints(root).map((e) => `${e.method} ${e.path}`);

    assert.deepEqual(paths, ["GET /api/items/", "POST /api/items/"]);
  });

  it("supports route chains and require()", () => {
    const root = tmpProject("scan", {
      "src/app.js": `
        const express = require("express");
        const r = require("./routes/r.js");
        const app = express();
        app.use("/v1", r);
      `,
      "src/routes/r.js": `
        const express = require("express");
        const router = express.Router();
        router.route("/thing").get(async () => {}).post(async () => {});
      `,
    });

    const paths = scanEndpoints(root)
      .map((e) => `${e.method} ${e.path}`)
      .sort();

    assert.deepEqual(paths, ["GET /v1/thing", "POST /v1/thing"]);
  });

  it("ignores unmounted files and deduplicates", () => {
    const root = tmpProject("scan", {
      "src/app.js": APP,
      "src/routes/items.js": `
        import express from "express";
        const router = express.Router();
        router.get("/", async () => {});
        router.get("/", async () => {});
        export default router;
      `,
      "src/orphan.js": `
        import express from "express";
        const router = express.Router();
        router.get("/hidden", async () => {});
        export default router;
      `,
    });

    const paths = scanEndpoints(root).map((e) => `${e.method} ${e.path}`);

    assert.deepEqual(paths, ["GET /api/items/"]);
  });

  it("terminates on circular router imports", () => {
    const root = tmpProject("scan", {
      "src/app.js": `
        import express from "express";
        import a from "./a.js";
        const app = express();
        app.use("/a", a);
      `,
      "src/a.js": `
        import express from "express";
        import b from "./b.js";
        const router = express.Router();
        router.use("/b", b);
        router.get("/here", async () => {});
        export default router;
      `,
      "src/b.js": `
        import express from "express";
        import a from "./a.js";
        const router = express.Router();
        router.use("/a", a);
        export default router;
      `,
    });

    const paths = scanEndpoints(root).map((e) => `${e.method} ${e.path}`);

    assert.deepEqual(paths, ["GET /a/here"]);
  });

  it("throws when no entry file exists", () => {
    const root = tmpProject("scan", {
      "src/plain.js": `export const x = 1;`,
    });

    assert.throws(() => scanEndpoints(root), ScanError);
  });
});
