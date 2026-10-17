import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildKnowledgeGraph } from "../src/scan/knowledge/buildKnowledge.js";
import { toContextLines } from "../src/tui/views/contextView.js";
import { handleParsed } from "../src/tui/repl/dispatchCommands.js";
import { parseSlashInput } from "../src/tui/repl/commandRegistry.js";
import { tmpProject } from "./helpers/project.js";

function fixture(files: Record<string, string>): string {
  return tmpProject("tui-context", files);
}

function authFixture(extra: Record<string, string> = {}): string {
  return fixture({
    "src/app.js": `
      import express from "express";
      import authRoutes from "./routes/auth.js";
      const app = express();
      app.use("/api/auth", authRoutes);
      export default app;
    `,
    "src/routes/auth.js": `
      import express from "express";
      import { profileController } from "../controllers/profileController.js";
      import { loginController } from "../controllers/loginController.js";
      const router = express.Router();
      router.get("/profile", auth, profileController.getProfile);
      router.post("/login", validate(loginSchema), loginController.login);
      export default router;
    `,
    "src/controllers/profileController.js": `
      import { userService } from "../services/userService.js";
      export const profileController = {
        getProfile: async (req, res) => {
          return userService.getProfile(req.userId);
        },
      };
    `,
    "src/controllers/loginController.js": `
      import { authService } from "../services/authService.js";
      export const loginController = {
        login: async (req, res) => {
          return authService.login(req.body);
        },
      };
    `,
    "src/services/userService.js": `
      import { User } from "../models/User.js";
      export const userService = {
        getProfile: async (id) => {
          return User.findById(id);
        },
      };
    `,
    "src/services/authService.js": `
      import { User } from "../models/User.js";
      export const authService = {
        login: async (body) => {
          return User.findByEmail(body.email);
        },
      };
    `,
    "src/models/User.js": `
      export const User = {
        findById(id) {
          return { id };
        },
        findByEmail(email) {
          return { email };
        },
      };
    `,
    "src/schemas/login.ts": `
      import Joi from "joi";
      export const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
      });
    `,
    ...extra,
  });
}

describe("/context TUI output", () => {
  it("renders counts plus per-endpoint controller/service/model/auth", () => {
    const result = handleParsed(authFixture(), parseSlashInput("/context"));

    assert.equal(result.action, "append");

    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /Endpoints: 2/);
    assert.match(text, /Nodes:\s+\d+/);
    assert.match(text, /Edges:\s+\d+/);
    assert.match(text, /Unresolved: \d+/);
    assert.match(text, /GET\s+\/api\/auth\/profile/);
    assert.match(text, /────────────────────────/);
    assert.match(text, /◯ Schema:\s+none/);
    assert.match(text, /✓ Controller:\s+profileController\.getProfile/);
    assert.match(text, /✓ Service:\s+userService\.getProfile/);
    assert.match(text, /✓ Model:\s+User/);
    assert.match(text, /✓ Auth:\s+required/);
    assert.match(text, /POST\s+\/api\/auth\/login/);
    assert.match(text, /✓ Schema:\s+loginSchema/);
    assert.match(text, /✓ Controller:\s+loginController\.login/);
    assert.match(text, /✓ Service:\s+authService\.login/);
    assert.match(text, /◯ Auth:\s+not detected/);
  });

  it("marks unresolved gaps explicitly with a missing suffix", () => {
    const root = authFixture({
      "src/routes/auth.js": `
        import express from "express";
        const router = express.Router();
        router.post("/ghost", missingController.handle);
        export default router;
      `,
    });

    const graph = buildKnowledgeGraph(root);
    const text = toContextLines(graph)
      .map((line) => line.text)
      .join("\n");

    assert.match(text, /POST\s+\/api\/auth\/ghost \[missing: schema, controller, service, model\]/);
    assert.match(text, /◯ Controller:\s+none/);
    assert.match(text, /Unresolved: 4/);
  });

  it("terminates on service cycles (A calls B calls A)", () => {
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
        import { aService } from "../services/aService.js";
        const router = express.Router();
        router.get("/cycle", aService.run);
        export default router;
      `,
      "src/services/aService.js": `
        import { bService } from "./bService.js";
        export const aService = {
          run: async () => bService.step(),
        };
      `,
      "src/services/bService.js": `
        import { aService } from "./aService.js";
        export const bService = {
          step: async () => aService.run(),
        };
      `,
    });

    const graph = buildKnowledgeGraph(root);
    const endpoint = graph.endpoints.find((e) => e.endpoint === "/api/cycle");

    assert.ok(endpoint);
    assert.ok(endpoint.service.includes("aService.run"));
    assert.ok(endpoint.service.includes("bService.step"));
  });

  it("maps rows to transcript tones", () => {
    const graph = buildKnowledgeGraph(authFixture());
    const lines = toContextLines(graph);
    const byText = new Map(lines.map((line) => [line.text, line.tone]));

    assert.equal(byText.get("Endpoints: 2"), "green");
    assert.equal(byText.get("GET    /api/auth/profile"), "default");
    assert.equal(byText.get("────────────────────────"), "dim");
    assert.equal(byText.get("  ✓ Controller: profileController.getProfile"), "green");
    assert.equal(byText.get("  ◯ Schema:     none"), "dim");
  });

  it("tones gap endpoints yellow", () => {
    const root = authFixture({
      "src/routes/auth.js": `
        import express from "express";
        const router = express.Router();
        router.post("/ghost", missingController.handle);
        export default router;
      `,
    });

    const lines = toContextLines(buildKnowledgeGraph(root));
    const gap = lines.find((line) => line.text.includes("/api/auth/ghost"));

    assert.ok(gap);
    assert.equal(gap.tone, "yellow");
  });

  it("prints No endpoints found when the graph is empty", () => {
    const lines = toContextLines({ endpoints: [], nodes: [], edges: [], unresolvedCount: 0 });

    assert.deepEqual(
      lines.map((line) => line.text),
      ["No endpoints found"],
    );
    assert.equal(lines[0].tone, "yellow");
  });
});

describe("/context filter", () => {
  it("shows a single endpoint with the filter line", () => {
    const result = handleParsed(authFixture(), parseSlashInput("/context GET /api/auth/profile"));

    assert.equal(result.action, "append");
    assert.equal(result.lines[0].text, "Filter: GET /api/auth/profile — showing 1 of 2 endpoints");
    assert.equal(result.lines[0].tone, "dim");

    const text = result.lines.map((line) => line.text).join("\n");
    assert.match(text, /Endpoints: 1/);
    assert.match(text, /GET\s+\/api\/auth\/profile/);
    assert.match(text, /✓ Controller:\s+profileController\.getProfile/);
    assert.doesNotMatch(text, /\/api\/auth\/login/);
  });

  it("filters by path only (all methods on that path)", () => {
    const text = handleParsed(authFixture(), parseSlashInput("/context /api/auth/login"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /Filter: \/api\/auth\/login — showing 1 of 2 endpoints/);
    assert.match(text, /POST\s+\/api\/auth\/login/);
    assert.doesNotMatch(text, /\/api\/auth\/profile/);
  });

  it("matches a concrete id against a :param template", () => {
    const root = authFixture({
      "src/routes/auth.js": `
        import express from "express";
        import { profileController } from "../controllers/profileController.js";
        const router = express.Router();
        router.get("/profile/:userId", auth, profileController.getProfile);
        export default router;
      `,
    });

    const text = handleParsed(root, parseSlashInput("/context GET /api/auth/profile/user-9"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /Filter: GET \/api\/auth\/profile\/user-9/);
    assert.match(text, /GET\s+\/api\/auth\/profile\/:userId/);
  });

  it("answers no-match with the available targets", () => {
    const text = handleParsed(authFixture(), parseSlashInput("/context GET /api/nope"))
      .lines.map((line) => line.text)
      .join("\n");

    assert.match(text, /No endpoint matches GET \/api\/nope\./);
    assert.match(text, /Available GET: GET \/api\/auth\/profile/);
  });
});
