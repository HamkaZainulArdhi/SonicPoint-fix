import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApiGraph } from "../src/scan/schemas/buildApiGraph.js";
import { scanSchemas } from "../src/scan/schemas/scanSchemas.js";
import { formatBodyEndpoints } from "../src/scan/reports/formatSchema.js";
import { toSchemaLines } from "../src/tui/views/schemaView.js";
import { handleParsed } from "../src/tui/repl/dispatchCommands.js";
import { parseSlashInput } from "../src/tui/repl/commandRegistry.js";
import { tmpProject } from "./helpers/project.js";

const APP = `
  import express from "express";
  import router from "./routes/items.js";
  const app = express();
  app.use("/api", router);
  export default app;
`;

const ROUTES = `
  import express from "express";
  const router = express.Router();
  router.post("/items", auth, validate(createItemSchema), createItem);
  router.get("/items", listItems);
  router.post("/plain", createPlain);
  router.post("/body", validate(validateBody), createBody);
  export default router;
`;

const SCHEMA = `
  import Joi from "joi";
  export const createItemSchema = Joi.object({
    title: Joi.string().required(),
    amount: Joi.number().required(),
    location: Joi.string(),
  });
`;

function itemFixture(extra: Record<string, string> = {}): string {
  return tmpProject("tui-schema", {
    "src/app.js": APP,
    "src/routes/items.js": ROUTES,
    "src/schemas/items.ts": SCHEMA,
    ...extra,
  });
}

describe("schema linking (acceptance)", () => {
  it("links POST /api/items to createItemSchema with confidence 100", () => {
    const graph = buildApiGraph(itemFixture());
    const node = graph.endpoints.find((n) => n.id === "POST /api/items");

    assert.ok(node);
    assert.equal(node.schemaStatus, "detected");
    assert.equal(node.link?.confidence, 100);
    assert.equal(node.link?.reason, "explicit-validation-middleware");
    assert.equal(node.link?.schemaName, "createItemSchema");
    assert.deepEqual(node.requiredFields, ["title", "amount"]);
  });

  it("marks GET without schema as none and excludes it from the report", () => {
    const graph = buildApiGraph(itemFixture());
    const node = graph.endpoints.find((n) => n.id === "GET /api/items");

    assert.ok(node);
    assert.equal(node.schemaStatus, "none");

    const text = formatBodyEndpoints(graph)
      .map((row) => row.text)
      .join("\n");
    assert.doesNotMatch(text, /GET\s+\/api\/items/);
  });

  it("marks POST without schema as unknown and renders Schema: unknown", () => {
    const graph = buildApiGraph(itemFixture());
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
    const graph = buildApiGraph(itemFixture());
    const node = graph.endpoints.find((n) => n.id === "POST /api/body");

    assert.ok(node);
    assert.equal(node.link, undefined);
    assert.equal(node.schemaStatus, "unknown");
  });

  it("ignores schema files outside the five allowed dirs", () => {
    const root = itemFixture({
      "src/lib/stray.ts": `
        import Joi from "joi";
        export const straySchema = Joi.object({ a: Joi.string() });
      `,
    });

    const names = scanSchemas(root).flatMap((file) => file.schemas.map((schema) => schema.name));
    assert.deepEqual(names, ["createItemSchema"]);
  });

  it("skips broken schema files silently, other files still processed", () => {
    const root = itemFixture({
      "src/schemas/broken.ts": `export const broken = {{{ not valid js`,
    });

    const names = scanSchemas(root).flatMap((file) => file.schemas.map((schema) => schema.name));
    assert.deepEqual(names, ["createItemSchema"]);
  });
});

describe("/schema TUI output", () => {
  it("renders body endpoints with Required vs Optional fields", () => {
    const result = handleParsed(itemFixture(), parseSlashInput("/schema"));

    assert.equal(result.action, "append");

    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /✔ Found 3 body endpoints/);
    assert.match(text, /POST\s+\/api\/items/);
    assert.match(text, /Schema: createItemSchema/);
    assert.match(text, /Required:/);
    assert.match(text, /✓ title\s+string/);
    assert.match(text, /✓ amount\s+number/);
    assert.match(text, /Optional:/);
    assert.match(text, /◯ location\s+string/);
  });

  it("maps rows to transcript tones", () => {
    const graph = buildApiGraph(itemFixture());
    const byText = new Map(toSchemaLines(graph).map((line) => [line.text, line.tone]));

    assert.equal(byText.get("✔ Found 3 body endpoints"), "green");
    assert.equal(byText.get("Schema: createItemSchema"), "cyan");
    assert.equal(byText.get("Schema: unknown"), "yellow");
  });

  it("prints No endpoints found when there are no body endpoints", () => {
    const root = tmpProject("tui-schema", {
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

describe("/schema filter", () => {
  it("shows a single endpoint with the filter line", () => {
    const result = handleParsed(itemFixture(), parseSlashInput("/schema post /api/items"));

    assert.equal(result.action, "append");
    assert.equal(result.lines[0].text, "Filter: POST /api/items — showing 1 of 3 body endpoints");
    assert.equal(result.lines[0].tone, "dim");

    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /✔ Found 1 body endpoint/);
    assert.match(text, /POST\s+\/api\/items/);
    assert.match(text, /Schema: createItemSchema/);
    assert.doesNotMatch(text, /\/api\/plain/);
    assert.doesNotMatch(text, /\/api\/body/);
    assert.doesNotMatch(text, /GET\s+\/api\/items/);
  });

  it("filters by method only", () => {
    const text = handleParsed(itemFixture(), parseSlashInput("/schema POST"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /Filter: POST — showing 3 of 3 body endpoints/);
    assert.match(text, /✔ Found 3 body endpoints/);
    assert.doesNotMatch(text, /GET\s+\/api\/items/);
  });

  it("answers no-match with the available targets", () => {
    const text = handleParsed(itemFixture(), parseSlashInput("/schema POST /api/nope"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /No endpoint matches POST \/api\/nope\./);
    assert.match(text, /Available POST: POST \/api\/items · POST \/api\/plain · POST \/api\/body/);
  });

  it("treats method GET as a normal no-match (body endpoints only)", () => {
    const text = handleParsed(itemFixture(), parseSlashInput("/schema GET /api/items"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /No endpoint matches GET \/api\/items\./);
    assert.match(text, /Available: POST \/api\/items/);
  });
});
