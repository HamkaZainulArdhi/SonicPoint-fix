// Pure state machine for /config flow — no Ink/fs/network.
// Mirrors cli/prompt.ts:askCredentials defaults, but stays testable.

import { AppCredentials } from "../../config/app.js";

export type ConfigStep = "baseUrl" | "loginEndpoint" | "email" | "password" | "tokenField" | "token";

export const CONFIG_STEPS: ConfigStep[] = ["baseUrl", "loginEndpoint", "email", "password", "tokenField", "token"];

export const CONFIG_DEFAULTS: Record<ConfigStep, string> = {
  baseUrl: "http://localhost:3000",
  loginEndpoint: "/api/auth/login",
  email: "admin@example.com",
  password: "",
  tokenField: "data.token",
  token: "",
};

export interface ConfigDraft {
  baseUrl: string;
  loginEndpoint: string;
  email: string;
  password: string;
  tokenField: string;
  token: string;
}

export function emptyDraft(existing: AppCredentials | null): ConfigDraft {
  return {
    baseUrl: existing?.baseUrl ?? CONFIG_DEFAULTS.baseUrl,
    loginEndpoint: existing?.loginEndpoint ?? CONFIG_DEFAULTS.loginEndpoint,
    email: existing?.email ?? CONFIG_DEFAULTS.email,
    password: existing?.password ?? CONFIG_DEFAULTS.password,
    tokenField: existing?.tokenField ?? CONFIG_DEFAULTS.tokenField,
    token: existing?.token ?? CONFIG_DEFAULTS.token,
  };
}

export function fallbackFor(step: ConfigStep, draft: ConfigDraft): string {
  return draft[step];
}

export function stepIndex(step: ConfigStep): number {
  return CONFIG_STEPS.indexOf(step);
}

export function nextStep(current: ConfigStep): ConfigStep | null {
  const i = stepIndex(current);
  return i < 0 || i >= CONFIG_STEPS.length - 1 ? null : CONFIG_STEPS[i + 1];
}

export function prevStep(current: ConfigStep): ConfigStep | null {
  const i = stepIndex(current);
  return i <= 0 ? null : CONFIG_STEPS[i - 1];
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateStep(step: ConfigStep, value: string, draft: ConfigDraft): ValidationResult {
  const trimmed = value.trim();
  switch (step) {
    case "baseUrl": {
      if (!trimmed) return { ok: false, error: "Base URL is required." };
      try {
        const url = new URL(trimmed);
        if (!/^https?:$/.test(url.protocol)) return { ok: false, error: "Base URL must start with http:// or https://." };
      } catch {
        return { ok: false, error: "Base URL is not a valid URL. Example: http://localhost:3000" };
      }
      return { ok: true };
    }
    case "loginEndpoint": {
      if (!trimmed) return { ok: false, error: "Login endpoint is required." };
      if (!trimmed.startsWith("/")) return { ok: false, error: 'Login endpoint must start with "/". Example: /api/auth/login' };
      return { ok: true };
    }
    case "email": {
      // Let the backend decide, but don't allow blank if token is also blank.
      if (!trimmed && !(draft.token ?? "").trim()) return { ok: false, error: "Email is required when token is empty (auto-login needs it)." };
      return { ok: true };
    }
    case "password": {
      if (!trimmed && !(draft.token ?? "").trim()) return { ok: false, error: "Password is required when token is empty (auto-login needs it)." };
      return { ok: true };
    }
    case "tokenField": {
      if (!trimmed) return { ok: false, error: "Token field path is required. Example: data.token" };
      return { ok: true };
    }
    case "token":
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function draftToCredentials(draft: ConfigDraft): AppCredentials {
  const token = draft.token.trim() || undefined;
  return {
    baseUrl: draft.baseUrl.trim(),
    loginEndpoint: draft.loginEndpoint.trim(),
    email: draft.email.trim(),
    password: draft.password,
    tokenField: draft.tokenField.trim(),
    token,
  };
}

export function isTokenEmpty(draft: ConfigDraft): boolean {
  return !draft.token.trim();
}
