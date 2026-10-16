// Config flow presentation — pure, no Ink.

import { CONFIG_STEPS, ConfigDraft, ConfigStep, stepIndex } from "../repl/configForm.js";
import { OutputLine } from "../repl/transcript.js";

const LABELS: Record<ConfigStep, string> = {
  baseUrl: "Base URL",
  loginEndpoint: "Login endpoint",
  email: "Email",
  password: "Password",
  tokenField: "Token field path",
  token: "Token (optional, leave blank to login automatically later)",
};

const HINTS: Record<ConfigStep, string> = {
  baseUrl: "Example: http://localhost:3000  — Enter to keep current.",
  loginEndpoint: 'Example: /api/auth/login  — must start with "/".',
  email: "Enter to keep current. Required when token is empty.",
  password: "Input is masked. Required when token is empty.",
  tokenField: "Example: data.token  — dotted path in the login response.",
  token: "Leave blank for auto-login. Enter a value to skip login and reuse a saved token.",
};

export function configPromptLabel(step: ConfigStep): string {
  return LABELS[step];
}

export function configHelpLine(step: ConfigStep): string {
  return HINTS[step];
}

export function configStepProgress(step: ConfigStep): string {
  const order: ConfigStep[] = ["baseUrl", "loginEndpoint", "email", "password", "tokenField", "token"];
  const i = order.indexOf(step);
  return `Step ${i + 1}/6`;
}

export function maskValue(step: ConfigStep, value: string): string {
  if (step === "password") return "•".repeat(value.length);
  return value;
}

/**
 * One unified 6-row list, no counters, no hints. Rows before the current
 * step are done (`✓`, green); the current and upcoming rows are open (`?`).
 * Values always sit in parens — the parens double as the placeholder, since
 * the input buffer is pre-filled from the same draft (Enter keeps them).
 */
export function toConfigFlowLines(draft: ConfigDraft, step: ConfigStep): OutputLine[] {
  const current = stepIndex(step);
  const lines: OutputLine[] = [{ text: "Backend config — Esc cancels, nothing is saved", tone: "dim" }, { text: "", tone: "default" }];
  for (const s of CONFIG_STEPS) {
    const done = stepIndex(s) < current;
    lines.push({
      text: `${done ? "✓" : "?"} ${configPromptLabel(s)}: ${displayDraftValue(s, draft)}`,
      tone: done ? "green" : stepIndex(s) === current ? "yellow" : "dim",
    });
  }
  return lines;
}

/**
 * Parenthesized display value. Secrets are never rendered — not even while
 * configuring (`(set)`/`(empty)` instead of the real value).
 */
export function displayDraftValue(step: ConfigStep, draft: ConfigDraft): string {
  if (step === "password") return draft.password ? "(set)" : "(empty)";
  if (step === "token") return draft.token.trim() ? "(set)" : "(empty)";
  const value = draft[step].trim();
  return value ? `(${value})` : "(empty)";
}
