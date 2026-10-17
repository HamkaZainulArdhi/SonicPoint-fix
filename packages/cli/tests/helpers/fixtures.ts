// Small value factories shared across suites: credentials, endpoints and
// TestResult/TestSession literals. Data only — no assertions, no I/O.

import { AppCredentials } from "../../src/config/app.js";
import { Endpoint } from "../../src/domain/endpoint.js";
import { ExecutedResult, SkippedResult, TestSession } from "../../src/domain/session.js";

export function credentials(baseUrl: string, withToken = false): AppCredentials {
  return {
    baseUrl,
    loginEndpoint: "/api/auth/login",
    email: "admin@example.com",
    password: "admin123",
    tokenField: "data.token",
    ...(withToken ? { token: "preset-token" } : {}),
  };
}

export function endpoint(method: string, path: string, sourceFile = "src/routes/api.js"): Endpoint {
  return { method, path, sourceFile, middlewares: [], validationSchemas: [] };
}

export function executedResult(overrides: Partial<ExecutedResult> = {}): ExecutedResult {
  return {
    kind: "executed",
    order: 1,
    method: "GET",
    path: "/api/items",
    resolvedPath: "/api/items",
    statusCode: 200,
    success: true,
    latencyMs: 5,
    auth: "bearer",
    aiGenerated: false,
    testedAt: "2026-01-01T00:00:01.000Z",
    ...overrides,
  };
}

export function skippedResult(overrides: Partial<SkippedResult> = {}): SkippedResult {
  return {
    kind: "skipped",
    order: 2,
    method: "POST",
    path: "/api/items",
    resolvedPath: "/api/items",
    reason: "No request payload could be generated.",
    testedAt: "2026-01-01T00:00:02.000Z",
    ...overrides,
  };
}

export function sampleSession(overrides: Partial<TestSession> = {}): TestSession {
  return {
    project: { slug: "demo", name: "demo" },
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:00:05.000Z",
    results: [executedResult()],
    ...overrides,
  };
}
