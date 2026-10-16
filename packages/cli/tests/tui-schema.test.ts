import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { buildApiGraph } from "../src/scan/schemas/buildApiGraph.js";
import { scanSchemas } from "../src/scan/schemas/scanSchemas.js";
import { formatBodyEndpoints } from "../src/scan/reports/formatSchema.js";
import { toSchemaLines } from "../src/tui/views/schemaView.js";
import { handleParsed } from "../src/tui/repl/dispatchCommands.js";
import { parseSlashInput } from "../src/tui/repl/commandRegistry.js";

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-tui-schema-"));

  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content.trimStart(), "utf-8");
  }

  return root;
}

const APP = `
  import express from "express";
  import router from "./routes/lahan.js";
  const app = express();
  app.use("/api", router);
  export default app;
`;

const ROUTES = `
  import express from "express";
  const router = express.Router();
  router.post("/lahan", auth, validate(createLahanSchema), createLahan);
  router.get("/lahan", listLahan);
  router.post("/plain", createPlain);
  router.post("/body", validate(validateBody), createBody);
  export default router;
`;

const SCHEMA = `
  import Joi from "joi";
  export const createLahanSchema = Joi.object({
    nama: Joi.string().required(),
    luas: Joi.number().required(),
    lokasi: Joi.string(),
  });
`;

function lahanFixture(extra: Record<string, string> = {}): string {
  return fixture({
    "src/app.js": APP,
    "src/routes/lahan.js": ROUTES,
    "src/schemas/lahan.ts": SCHEMA,
    ...extra,
  });
}

describe("schema linking (acceptance)", () => {
  it("links POST /api/lahan to createLahanSchema with confidence 100", () => {
    const graph = buildApiGraph(lahanFixture());
    const node = graph.endpoints.find((n) => n.id === "POST /api/lahan");

    assert.ok(node);
    assert.equal(node.schemaStatus, "detected");
    assert.equal(node.link?.confidence, 100);
    assert.equal(node.link?.reason, "explicit-validation-middleware");
    assert.equal(node.link?.schemaName, "createLahanSchema");
    assert.deepEqual(node.requiredFields, ["nama", "luas"]);
  });

  it("marks GET without schema as none and excludes it from the report", () => {
    const graph = buildApiGraph(lahanFixture());
    const node = graph.endpoints.find((n) => n.id === "GET /api/lahan");

    assert.ok(node);
    assert.equal(node.schemaStatus, "none");

    const text = formatBodyEndpoints(graph)
      .map((row) => row.text)
      .join("\n");
    assert.doesNotMatch(text, /GET\s+\/api\/lahan/);
  });

  it("marks POST without schema as unknown and renders Schema: unknown", () => {
    const graph = buildApiGraph(lahanFixture());
    const node = graph.endpoints.find((n) => n.id === "POST /api/plain");

    assert.ok(node);
    assert.equal(node.schemaStatus, "unknown");

    const text = formatBodyEndpoints(graph)
      .map((row) => row.text)
      .join("\n");
    assert.match(text, /POST\s+\/api\/plain/);
    assert.match(text, /Schema: unknown/);
  });

  it("does not link validateBody (no schema-suffix naming convention)", () => {
    const graph = buildApiGraph(lahanFixture());
    const node = graph.endpoints.find((n) => n.id === "POST /api/body");

    assert.ok(node);
    assert.equal(node.link, undefined);
    assert.equal(node.schemaStatus, "unknown");
  });

  it("ignores schema files outside the five allowed dirs", () => {
    const root = lahanFixture({
      "src/lib/stray.ts": `
        import Joi from "joi";
        export const straySchema = Joi.object({ a: Joi.string() });
      `,
    });

    const names = scanSchemas(root).flatMap((file) => file.schemas.map((schema) => schema.name));
    assert.deepEqual(names, ["createLahanSchema"]);
  });

  it("skips broken schema files silently, other files still processed", () => {
    const root = lahanFixture({
      "src/schemas/broken.ts": `export const broken = {{{ not valid js`,
    });

    const names = scanSchemas(root).flatMap((file) => file.schemas.map((schema) => schema.name));
    assert.deepEqual(names, ["createLahanSchema"]);
  });
});

describe("/schema TUI output", () => {
  it("renders body endpoints with Required vs Optional fields", () => {
    const result = handleParsed(lahanFixture(), parseSlashInput("/schema"));

    assert.equal(result.action, "append");

    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /✔ Found 3 body endpoints/);
    assert.match(text, /POST\s+\/api\/lahan/);
    assert.match(text, /Schema: createLahanSchema/);
    assert.match(text, /Required:/);
    assert.match(text, /✓ nama\s+string/);
    assert.match(text, /✓ luas\s+number/);
    assert.match(text, /Optional:/);
    assert.match(text, /◯ lokasi\s+string/);
  });

  it("maps rows to transcript tones", () => {
    const graph = buildApiGraph(lahanFixture());
    const byText = new Map(toSchemaLines(graph).map((line) => [line.text, line.tone]));

    assert.equal(byText.get("✔ Found 3 body endpoints"), "green");
    assert.equal(byText.get("Schema: createLahanSchema"), "cyan");
    assert.equal(byText.get("Schema: unknown"), "yellow");
  });

  it("prints No endpoints found when there are no body endpoints", () => {
    const root = fixture({
      "src/app.js": `
        import express from "express";
        import router from "./routes/r.js";
        const app = express();
        app.use("/api", router);
        export default app;
      `,
      "src/routes/r.js": `
        import express from "express";
        const router = express.Router();
        router.get("/items", listItems);
        export default router;
      `,
    });

    const result = handleParsed(root, parseSlashInput("/schema"));
    assert.equal(result.action, "append");
    assert.deepEqual(
      result.lines.map((line) => line.text),
      ["No endpoints found"],
    );
  });
});
