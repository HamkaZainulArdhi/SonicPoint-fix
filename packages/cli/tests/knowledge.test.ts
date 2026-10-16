import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { buildKnowledgeGraph } from "../src/scan/knowledge/buildKnowledge.js";

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-knowledge-"));

  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content.trimStart(), "utf-8");
  }

  return root;
}

const RESOLVED = {
  "src/app.js": `
    import express from "express";
    import lahanRoutes from "./routes/lahanRoutes.js";
    const app = express();
    app.use("/api/lahan", lahanRoutes);
    export default app;
  `,
  "src/routes/lahanRoutes.js": `
    import express from "express";
    import { validate } from "../middleware/validate.js";
    import { createLahanSchema } from "../validations/lahanSchema.js";
    import { lahanController } from "../controllers/lahanController.js";
    const router = express.Router();
    router.post("/create", validate(createLahanSchema), lahanController.createLahan);
    export default router;
  `,
  "src/middleware/validate.js": `
    export function validate(schema) {
      return (req, res, next) => next();
    }
  `,
  "src/validations/lahanSchema.js": `
    import Joi from "joi";
    export const createLahanSchema = Joi.object({ name: Joi.string().required() });
  `,
  "src/controllers/lahanController.js": `
    import { lahanService } from "../services/lahanService.js";
    export const lahanController = {
      createLahan: async (req, res) => {
        return lahanService.create(req.body);
      },
    };
  `,
  "src/services/lahanService.js": `
    import { Lahan } from "../models/Lahan.js";
    export const lahanService = {
      create: async (payload) => {
        return Lahan.create(payload);
      },
    };
  `,
  "src/models/Lahan.js": `
    export const Lahan = {
      create(payload) {
        return payload;
      },
    };
  `,
};

describe("buildKnowledgeGraph", () => {
  it("resolves the full controller → service → model chain", () => {
    const graph = buildKnowledgeGraph(fixture(RESOLVED));
    const endpoint = graph.endpoints.find((e) => e.endpoint === "/api/lahan/create");

    assert.equal(endpoint?.schema, "createLahanSchema");
    assert.equal(endpoint?.controller, "lahanController.createLahan");
    assert.ok(endpoint?.service.includes("lahanService.create"));
    assert.ok(endpoint?.model.includes("Lahan"));
    assert.equal(graph.unresolvedCount, 0);
  });

  it("records gaps when the chain is partial", () => {
    const root = fixture({
      "src/app.js": `
        import express from "express";
        import sensorRoutes from "./routes/sensorRoutes.js";
        const app = express();
        app.use("/api/sensor", sensorRoutes);
        export default app;
      `,
      "src/routes/sensorRoutes.js": `
        import express from "express";
        import { sensorController } from "../controllers/sensorController.js";
        const router = express.Router();
        router.delete("/sensor/:sensorId", sensorController.deleteSensor);
        export default router;
      `,
      "src/controllers/sensorController.js": `
        export const sensorController = {
          deleteSensor: async () => {
            return true;
          },
        };
      `,
    });

    const graph = buildKnowledgeGraph(root);
    const endpoint = graph.endpoints.find((e) => e.endpoint === "/api/sensor/sensor/:sensorId");

    assert.equal(endpoint?.controller, "sensorController.deleteSensor");
    assert.deepEqual(endpoint?.service, []);
    assert.ok(endpoint?.unresolved.includes("service"));
  });
});
