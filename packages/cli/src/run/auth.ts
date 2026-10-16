// Auth session: reuse the saved token when present, otherwise log in
// once through the configured login endpoint. Pure except for fetch.

import { AppCredentials, loadCredentials } from "../config/app.js";
import { Fetch, joinUrl } from "./http.js";

export interface AuthSession {
  token: string;
  baseUrl: string;
}

export async function login(
  credentials: AppCredentials,
  fetchImpl: Fetch,
): Promise<AuthSession> {
  const baseUrl = credentials.baseUrl.replace(/\/+$/, "");

  if (credentials.token) {
    return { token: credentials.token, baseUrl };
  }

  const loginUrl = joinUrl(baseUrl, credentials.loginEndpoint);
  let response: Awaited<ReturnType<Fetch>>;

  try {
    response = await fetchImpl(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach login endpoint ${loginUrl} (${cause}). Is the backend running? Check baseUrl and loginEndpoint in /config.`);
  }

  if (!response.ok) {
    throw new Error(
      `Login failed with status ${response.status} at ${credentials.loginEndpoint}. Check loginEndpoint, email/password, or token field mapping in /config.`,
    );
  }

  const data: unknown = await response.json();
  const token = lookupPath(data, credentials.tokenField);

  if (typeof token !== "string" || !token) {
    throw new Error(`Token not found at field "${credentials.tokenField}" in login response. Check tokenField in /config.`);
  }

  return { token, baseUrl };
}

/** Resolve credentials from disk (saved token may already exist). */
export function loadSessionCredentials(rootDir: string): AppCredentials | null {
  return loadCredentials(rootDir);
}

function lookupPath(value: unknown, dotted: string): unknown {
  return dotted
    .split(".")
    .reduce<unknown>((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, value);
}
