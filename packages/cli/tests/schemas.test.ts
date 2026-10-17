import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scanSchemas } from "../src/scan/schemas/scanSchemas.js";
import { tmpProject } from "./helpers/project.js";

describe("scanSchemas", () => {
  it("extracts Joi schemas with modifiers", () => {
    const root = tmpProject("schema", {
      "src/validations/item.js": `
        import Joi from "joi";
        export const createItemSchema = Joi.object({
          name: Joi.string().min(3).required(),
          age: Joi.number().optional(),
        });
      `,
    });

    const [file] = scanSchemas(root);

    assert.equal(file.framework, "joi");
    assert.equal(file.schemas[0].name, "createItemSchema");

    const name = file.schemas[0].properties.find((p) => p.name === "name");
    assert.equal(name?.type, "string");
    assert.equal(name?.required, true);
    assert.deepEqual(name?.constraints, ["min: 3"]);
  });

  it("extracts Zod schemas (required by default)", () => {
    const root = tmpProject("schema", {
      "src/schemas/user.ts": `
        import { z } from "zod";
        export const userSchema = z.object({
          email: z.string().email(),
          nickname: z.string().optional(),
        });
      `,
    });

    const [file] = scanSchemas(root);

    assert.equal(file.framework, "zod");
    const email = file.schemas[0].properties.find((p) => p.name === "email");
    assert.equal(email?.required, true);
    assert.deepEqual(email?.formats, ["email"]);
  });

  it("ignores files outside schema directories", () => {
    const root = tmpProject("schema", {
      "src/routes/items.js": `
        import Joi from "joi";
        export const stray = Joi.object({ a: Joi.string() });
      `,
    });

    assert.deepEqual(scanSchemas(root), []);
  });
});
