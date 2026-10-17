import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SLASH_COMMANDS,
  parseSlashInput,
  resolveEnter,
  suggestCommands,
} from "../src/tui/repl/commandRegistry.js";
import { handleParsed } from "../src/tui/repl/dispatchCommands.js";
import { describeQuery, matchesQuery, parseFilterArgs } from "../src/tui/repl/filterArgs.js";
import { MAX_TRANSCRIPT_ENTRIES, TranscriptEntry, capTranscript } from "../src/tui/repl/transcript.js";
import { tmpProject } from "./helpers/project.js";

function entry(id: number): TranscriptEntry {
  return { id, command: "/scan", lines: [] };
}

function scanFixture(): string {
  return tmpProject("repl", {
    "src/app.js": `
      import express from "express";
      import r from "./routes/r.js";
      const app = express();
      app.use("/api/items", r);
      export default app;
    `,
    "src/routes/r.js": `
      import express from "express";
      const router = express.Router();
      router.get("/", async () => {});
      router.post("/:id", async () => {});
      export default router;
    `,
  });
}

describe("slash command registry", () => {
  it("exposes the eight high-level commands", () => {
    assert.deepEqual(
      SLASH_COMMANDS.map((command) => command.name),
      ["scan", "schema", "context", "test", "report", "config", "clear", "quit"],
    );
  });

  it("marks scan/schema/context/test/report/config/clear/quit as ready", () => {
    for (const command of SLASH_COMMANDS) {
      const ready =
        command.name === "scan" ||
        command.name === "schema" ||
        command.name === "context" ||
        command.name === "test" ||
        command.name === "report" ||
        command.name === "config" ||
        command.name === "clear" ||
        command.name === "quit";
      assert.equal(command.status === "ready", ready, `/${command.name}`);
    }
  });
});

describe("parseSlashInput", () => {
  it("parses a bare command", () => {
    const parsed = parseSlashInput("  /scan  ");
    assert.equal(parsed.kind, "command");
    if (parsed.kind === "command") {
      assert.equal(parsed.command.name, "scan");
      assert.deepEqual(parsed.args, []);
    }
  });

  it("parses command name case-insensitively with args", () => {
    const parsed = parseSlashInput("/TEST POST /api/auth/login");
    assert.equal(parsed.kind, "command");
    if (parsed.kind === "command") {
      assert.equal(parsed.command.name, "test");
      assert.deepEqual(parsed.args, ["POST", "/api/auth/login"]);
    }
  });

  it("classifies empty, non-slash, and unknown input", () => {
    assert.equal(parseSlashInput("   ").kind, "empty");
    assert.equal(parseSlashInput("hello").kind, "not-slash");
    const unknown = parseSlashInput("/nope");
    assert.equal(unknown.kind, "unknown");
    if (unknown.kind === "unknown") {
      assert.equal(unknown.name, "nope");
    }
  });
});

describe("parseFilterArgs (shared by /report, /schema, /context)", () => {
  it("accepts every [METHOD] [PATH] shape", () => {
    assert.deepEqual(parseFilterArgs([], "schema"), { ok: true, value: {} });
    assert.deepEqual(parseFilterArgs(["post"], "schema"), { ok: true, value: { method: "POST" } });
    assert.deepEqual(parseFilterArgs(["/api/items"], "schema"), { ok: true, value: { path: "/api/items" } });
    assert.deepEqual(parseFilterArgs(["PATCH", "/api/items/:itemId"], "schema"), {
      ok: true,
      value: { method: "PATCH", path: "/api/items/:itemId" },
    });
  });

  it("rejects unknown filters, unknown methods, bad paths, and extra args", () => {
    const unknown = parseFilterArgs(["nope"], "schema");
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.match(unknown.error, /Unknown \/schema filter/);

    const method = parseFilterArgs(["FOO", "/api/items"], "schema");
    assert.equal(method.ok, false);
    if (!method.ok) assert.match(method.error, /Unknown method/);

    const path = parseFilterArgs(["GET", "api/items"], "schema");
    assert.equal(path.ok, false);
    if (!path.ok) assert.match(path.error, /must start with a slash/);

    const extra = parseFilterArgs(["GET", "/a", "/b"], "schema");
    assert.equal(extra.ok, false);
    if (!extra.ok) assert.match(extra.error, /Too many arguments/);
  });
});

describe("matchesQuery", () => {
  it("matches method case-insensitively and normalizes trailing slashes", () => {
    const endpoint = { method: "POST", path: "/api/items/" };
    assert.equal(matchesQuery(endpoint, { method: "post" }), true);
    assert.equal(matchesQuery(endpoint, { path: "/api/items" }), true);
    assert.equal(matchesQuery(endpoint, { method: "GET", path: "/api/items" }), false);
  });

  it("matches a concrete path against a :param template", () => {
    assert.equal(matchesQuery({ method: "GET", path: "/api/items/:itemId" }, { path: "/api/items/item-42" }), true);
    assert.equal(matchesQuery({ method: "GET", path: "/api/items/:itemId" }, { path: "/api/orders/item-42" }), false);
  });
});

describe("describeQuery", () => {
  it("joins whatever parts are present", () => {
    assert.equal(describeQuery({ method: "POST", path: "/api/items" }), "POST /api/items");
    assert.equal(describeQuery({ method: "POST" }), "POST");
    assert.equal(describeQuery({ path: "/api/items" }), "/api/items");
  });
});

describe("suggestCommands", () => {
  it("lists everything on a bare slash and filters by prefix", () => {
    assert.equal(suggestCommands("").length, SLASH_COMMANDS.length);
    assert.deepEqual(
      suggestCommands("sc").map((command) => command.name),
      ["scan", "schema"],
    );
    assert.deepEqual(
      suggestCommands("QUIT").map((command) => command.name),
      ["quit"],
    );
    assert.deepEqual(suggestCommands("zzz"), []);
  });
});

describe("resolveEnter", () => {
  const scan = SLASH_COMMANDS.find((command) => command.name === "scan")!;

  it("completes a strict prefix and executes on exact match", () => {
    assert.deepEqual(resolveEnter("/sc", scan), { action: "complete", input: "/scan " });
    assert.deepEqual(resolveEnter("/scan", scan), { action: "execute" });
  });

  it("preserves typed args when completing", () => {
    assert.deepEqual(resolveEnter("/sc POST /x", scan), {
      action: "complete",
      input: "/scan POST /x",
    });
  });

  it("executes when there is no suggestion", () => {
    assert.deepEqual(resolveEnter("/scan", null), { action: "execute" });
    assert.deepEqual(resolveEnter("plain text", null), { action: "execute" });
  });
});

describe("capTranscript", () => {
  it("keeps the tail once over the limit", () => {
    const entries = Array.from({ length: MAX_TRANSCRIPT_ENTRIES + 5 }, (_, i) => entry(i));
    const capped = capTranscript(entries);
    assert.equal(capped.length, MAX_TRANSCRIPT_ENTRIES);
    assert.equal(capped[0].id, 5);
  });
});

describe("handleParsed", () => {
  it("maps quit/clear and previews async commands honestly", () => {
    assert.equal(handleParsed("/tmp", parseSlashInput("/quit")).action, "quit");
    assert.equal(handleParsed("/tmp", parseSlashInput("/clear")).action, "clear");
    const report = handleParsed("/tmp", parseSlashInput("/report"));
    assert.equal(report.action, "append");
    assert.match(report.lines[0].text, /Publishing/);
    // Every slash command is now ready — no soon stubs remain.
    assert.ok(SLASH_COMMANDS.every((command) => command.status === "ready") === true);
  });

  it("rejects bare /test (method is required) without touching the network", () => {
    const result = handleParsed("/tmp", parseSlashInput("/test"));
    assert.equal(result.action, "append");
    assert.match(result.lines[0].text, /method is required/);
  });

  it("answers /config synchronously without touching disk or network", () => {
    const result = handleParsed("/tmp", parseSlashInput("/config"));
    assert.equal(result.action, "append");
    assert.match(result.lines[0].text, /REPL/);
  });

  it("guides unknown and non-slash input toward available commands", () => {
    const unknown = handleParsed("/tmp", parseSlashInput("/nope"));
    assert.match(unknown.lines[0].text, /Unknown command/);
    assert.match(unknown.lines[0].text, /\/scan/);
    const plain = handleParsed("/tmp", parseSlashInput("hello"));
    assert.match(plain.lines[0].text, /\/scan/);
  });

  it("lists every endpoint with method in /scan output", () => {
    const result = handleParsed(scanFixture(), parseSlashInput("/scan"));
    assert.equal(result.action, "append");
    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /Found 1 route files/);
    assert.match(text, /Found 2 endpoints/);
    assert.match(text, /GET\s+\/api\/items\//);
    assert.match(text, /POST\s+\/api\/items\/:id/);
    assert.match(text, /Scan completed\./);
  });
});
