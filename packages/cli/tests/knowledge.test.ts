import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildKnowledgeGraph } from "../src/scan/knowledge/buildKnowledge.js";
import { tmpProject } from "./helpers/project.js";

const RESOLVED = {
  "src/app.js": `
    import express from "express";
    import itemRoutes from "./routes/itemRoutes.js";
    const app = express();
    app.use("/api/items", itemRoutes);
    export default app;
  `,
  "src/routes/itemRoutes.js": `
    import express from "express";
    import { validate } from "../middleware/validate.js";
    import { createItemSchema } from "../validations/itemSchema.js";
    import { itemController } from "../controllers/itemController.js";
    const router = express.Router();
    router.post("/create", validate(createItemSchema), itemController.createItem);
    export default router;
  `,
  "src/middleware/validate.js": `
    export function validate(schema) {
      return (req, res, next) => next();
    }
  `,
  "src/validations/itemSchema.js": `
    import Joi from "joi";
    export const createItemSchema = Joi.object({ name: Joi.string().required() });
  `,
  "src/controllers/itemController.js": `
    import { itemService } from "../services/itemService.js";
    export const itemController = {
      createItem: async (req, res) => {
        return itemService.create(req.body);
      },
    };
  `,
  "src/services/itemService.js": `
    import { Item } from "../models/Item.js";
    export const itemService = {
      create: async (payload) => {
        return Item.create(payload);
      },
    };
  `,
  "src/models/Item.js": `
    export const Item = {
      create(payload) {
        return payload;
      },
    };
  `,
};

describe("buildKnowledgeGraph", () => {
  it("resolves the full controller → service → model chain", () => {
    const graph = buildKnowledgeGraph(tmpProject("knowledge", RESOLVED));
    const endpoint = graph.endpoints.find((e) => e.endpoint === "/api/items/create");

    assert.equal(endpoint?.schema, "createItemSchema");
    assert.equal(endpoint?.controller, "itemController.createItem");
    assert.ok(endpoint?.service.includes("itemService.create"));
    assert.ok(endpoint?.model.includes("Item"));
    assert.equal(graph.unresolvedCount, 0);
  });

  it("records gaps when the chain is partial", () => {
    const root = tmpProject("knowledge", {
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
