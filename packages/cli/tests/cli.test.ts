import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { selectTargets } from "../src/cli/selection.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-cli-"));
  fs.mkdirSync(path.join(root, "src", "routes"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "src", "app.js"),
    `
    import express from "express";
    import r from "./routes/r.js";
    const app = express();
    app.use("/api/items", r);
    export default app;
    `.trimStart(),
  );
  fs.writeFileSync(
    path.join(root, "src", "routes", "r.js"),
    `
    import express from "express";
    const router = express.Router();
    router.get("/", async () => {});
    export default router;
    `.trimStart(),
  );
  return root;
}

function runCli(root: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs"), path.join(repoRoot, "bin", "index.ts"), ...args],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

describe("cli", () => {
  it("selects GET endpoints by default", () => {
    const selection = selectTargets(
      [
        { method: "GET", path: "/a", sourceFile: "f", middlewares: [], validationSchemas: [] },
        { method: "POST", path: "/a", sourceFile: "f", middlewares: [], validationSchemas: [] },
      ],
      {},
    );

    assert.equal(selection.ok, true);
    if (selection.ok) {
      assert.deepEqual(
        selection.endpoints.map((e) => e.method),
        ["GET"],
      );
    }
  });

  it("requires a target with --method", () => {
    const selection = selectTargets([], { method: "POST" });

    assert.equal(selection.ok, false);
  });

  it("exits 1 when --method has no target (real CLI)", async () => {
    const root = fixture();
    const result = await runCli(root, ["send", "--method", "POST"]);

    assert.equal(result.code, 1);
    assert.match(result.output, /target is required/);
  });

  it("exits 1 for unknown endpoints (real CLI)", async () => {
    const root = fixture();
    const result = await runCli(root, ["send", "--method", "GET", "/api/nope"]);

    assert.equal(result.code, 1);
    assert.match(result.output, /not found/);
  });
});
