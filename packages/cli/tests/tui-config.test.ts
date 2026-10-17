import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { loadCredentials, saveCredentials } from "../src/config/app.js";
import {
  CONFIG_DEFAULTS,
  CONFIG_STEPS,
  ConfigDraft,
  draftToCredentials,
  emptyDraft,
  fallbackFor,
  nextStep,
  prevStep,
  stepIndex,
  validateStep,
} from "../src/tui/repl/configForm.js";
import {
  configHelpLine,
  configPromptLabel,
  configStepProgress,
  displayDraftValue,
  maskValue,
  toConfigFlowLines,
} from "../src/tui/views/configView.js";
import { tmpDir } from "./helpers/project.js";

function draft(overrides: Partial<ConfigDraft> = {}): ConfigDraft {
  return {
    baseUrl: "http://localhost:3000",
    loginEndpoint: "/api/auth/login",
    email: "admin@example.com",
    password: "s3cr3t",
    tokenField: "data.token",
    token: "",
    ...overrides,
  };
}

describe("config steps", () => {
  it("walks six steps in order and then ends", () => {
    assert.deepEqual(CONFIG_STEPS, ["baseUrl", "loginEndpoint", "email", "password", "tokenField", "token"]);
    let step = CONFIG_STEPS[0];
    for (let i = 1; i < CONFIG_STEPS.length; i++) {
      const following = nextStep(step);
      assert.equal(following, CONFIG_STEPS[i]);
      if (following) step = following;
    }
    assert.equal(nextStep(step), null);
  });

  it("indexes and steps back symmetrically", () => {
    assert.equal(stepIndex("baseUrl"), 0);
    assert.equal(stepIndex("token"), 5);
    assert.equal(prevStep("baseUrl"), null);
    assert.equal(prevStep("email"), "loginEndpoint");
  });

  it("mirrors cli/prompt.ts defaults", () => {
    assert.equal(CONFIG_DEFAULTS.baseUrl, "http://localhost:3000");
    assert.equal(CONFIG_DEFAULTS.loginEndpoint, "/api/auth/login");
    assert.equal(CONFIG_DEFAULTS.email, "admin@example.com");
    assert.equal(CONFIG_DEFAULTS.tokenField, "data.token");
  });
});

describe("emptyDraft", () => {
  it("falls back to defaults without existing credentials", () => {
    const d = emptyDraft(null);
    assert.equal(d.baseUrl, CONFIG_DEFAULTS.baseUrl);
    assert.equal(d.loginEndpoint, CONFIG_DEFAULTS.loginEndpoint);
    assert.equal(d.email, CONFIG_DEFAULTS.email);
    assert.equal(d.tokenField, CONFIG_DEFAULTS.tokenField);
    assert.equal(fallbackFor("email", d), d.email);
  });

  it("prefills from existing credentials", () => {
    const d = emptyDraft({
      baseUrl: "http://localhost:3001",
      loginEndpoint: "/auth/login",
      email: "ops@example.com",
      password: "pw",
      tokenField: "token",
      token: "abc",
    });
    assert.equal(d.baseUrl, "http://localhost:3001");
    assert.equal(d.token, "abc");
  });
});

describe("validateStep", () => {
  it("requires a valid http(s) base URL", () => {
    const d = draft();
    assert.equal(validateStep("baseUrl", "", d).ok, false);
    assert.equal(validateStep("baseUrl", "localhost:3000", d).ok, false);
    assert.equal(validateStep("baseUrl", "ftp://x", d).ok, false);
    assert.equal(validateStep("baseUrl", "http://localhost:3000", d).ok, true);
  });

  it("requires a leading slash on the login endpoint", () => {
    const d = draft();
    assert.equal(validateStep("loginEndpoint", "", d).ok, false);
    assert.equal(validateStep("loginEndpoint", "api/auth/login", d).ok, false);
    assert.equal(validateStep("loginEndpoint", "/api/auth/login", d).ok, true);
  });

  it("requires email+password only when token is empty", () => {
    const noToken = draft({ token: "" });
    const withToken = draft({ token: "abc" });
    assert.equal(validateStep("email", "", noToken).ok, false);
    assert.equal(validateStep("password", "", noToken).ok, false);
    assert.equal(validateStep("email", "", withToken).ok, true);
    assert.equal(validateStep("password", "", withToken).ok, true);
    assert.equal(validateStep("email", "a@b.c", noToken).ok, true);
  });

  it("requires tokenField but always accepts token", () => {
    const d = draft();
    assert.equal(validateStep("tokenField", "", d).ok, false);
    assert.equal(validateStep("tokenField", "data.token", d).ok, true);
    assert.equal(validateStep("token", "", d).ok, true);
  });
});

describe("draftToCredentials", () => {
  it("trims fields and drops a blank token (mirrors prompt.ts)", () => {
    const creds = draftToCredentials(draft({ baseUrl: "  http://x  ", token: "   " }));
    assert.equal(creds.baseUrl, "http://x");
    assert.equal(creds.token, undefined);
  });

  it("keeps a non-blank token and never trims the password", () => {
    const creds = draftToCredentials(draft({ password: "  pw  ", token: "abc" }));
    assert.equal(creds.password, "  pw  ");
    assert.equal(creds.token, "abc");
  });
});

describe("configView", () => {
  it("labels, hints, and progress exist for every step", () => {
    for (const step of CONFIG_STEPS) {
      assert.ok(configPromptLabel(step).length > 0, step);
      assert.ok(configHelpLine(step).length > 0, step);
    }
    assert.equal(configStepProgress("baseUrl"), "Step 1/6");
    assert.equal(configStepProgress("token"), "Step 6/6");
  });

  it("masks passwords without leaking a single character", () => {
    const masked = maskValue("password", "s3cr3t!");
    assert.equal(masked, "•••••••");
    assert.doesNotMatch(masked, /s3cr3t/);
    assert.equal(maskValue("email", "a@b.c"), "a@b.c");
  });

  it("redacts secrets in flow lines", () => {
    const d = draft({ password: "s3cr3t", token: "tok-123" });
    assert.equal(displayDraftValue("password", d), "(set)");
    assert.equal(displayDraftValue("token", d), "(set)");
    assert.equal(displayDraftValue("token", draft({ token: "" })), "(empty)");
    assert.equal(displayDraftValue("email", d), "(admin@example.com)");
    assert.equal(displayDraftValue("email", draft({ email: "" })), "(empty)");
    const text = toConfigFlowLines(d, "token").map((line) => line.text).join("\n");
    assert.doesNotMatch(text, /s3cr3t|tok-123/);
  });
});

describe("unified flow list (no counters, no hints)", () => {
  it("always renders six rows with ✓ before and ? at/after the current step", () => {
    const d = draft();
    const lines = toConfigFlowLines(d, "password");
    const rows = lines.filter((line) => line.text.startsWith("✓") || line.text.startsWith("?"));
    assert.equal(rows.length, 6);
    assert.deepEqual(
      rows.map((line) => line.text[0]),
      ["✓", "✓", "✓", "?", "?", "?"],
    );
    const tones = new Map(rows.map((line) => [line.text, line.tone]));
    assert.equal(tones.get("✓ Base URL: (http://localhost:3000)"), "green");
    assert.equal(tones.get("? Password: (set)"), "yellow");
  });

  it("shows placeholders from the prefilled draft and no step counters or hints", () => {
    const d = draft({ password: "", token: "" });
    const lines = toConfigFlowLines(d, "baseUrl");
    const text = lines.map((line) => line.text).join("\n");
    assert.match(text, /Backend config — Esc cancels, nothing is saved/);
    assert.match(text, /\? Base URL: \(http:\/\/localhost:3000\)/);
    assert.match(text, /\? Password: \(empty\)/);
    assert.doesNotMatch(text, /Step \d\/6/);
    assert.doesNotMatch(text, /Enter to keep|dotted path|auto-login/);
  });
});

describe("config save round-trip (file only, no network)", () => {
  it("writes .sonic-point.json readable by loadCredentials", () => {
    const root = tmpDir("tui-config");
    const creds = draftToCredentials(draft());
    saveCredentials(root, creds);
    const loaded = loadCredentials(root);
    // JSON round-trip drops `token: undefined` — assert field-wise instead.
    assert.equal(loaded?.baseUrl, creds.baseUrl);
    assert.equal(loaded?.loginEndpoint, creds.loginEndpoint);
    assert.equal(loaded?.email, creds.email);
    assert.equal(loaded?.password, creds.password);
    assert.equal(loaded?.tokenField, creds.tokenField);
    assert.equal(loaded?.token, undefined);
    // The file MUST hold the password (same contract as `init`) —
    // redaction applies to transcript lines only, never to the file.
    const raw = fs.readFileSync(path.join(root, ".sonic-point.json"), "utf-8");
    assert.ok(raw.includes(creds.baseUrl));
    assert.ok(raw.includes(creds.password));
  });
});
