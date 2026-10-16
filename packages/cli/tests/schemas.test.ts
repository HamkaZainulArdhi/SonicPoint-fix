import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { scanSchemas } from "../src/scan/schemas/scanSchemas.js";

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-schema-"));

  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content.trimStart(), "utf-8");
  }

  return root;
}

describe("scanSchemas", () => {
  it("extracts Joi schemas with modifiers", () => {
    const root = fixture({
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
    const root = fixture({
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
    const root = fixture({
      "src/routes/items.js": `
        import Joi from "joi";
        export const stray = Joi.object({ a: Joi.string() });
      `,
    });

    assert.deepEqual(scanSchemas(root), []);
  });
});
