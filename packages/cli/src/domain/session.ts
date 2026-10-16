// Core domain: a test session. A session is an ordered list of results;
// skipped endpoints are results too (no parallel arrays).

export type JsonObject = Record<string, unknown>;

export interface ExecutedResult {
  kind: "executed";
  order: number;
  method: string;
  path: string;
  resolvedPath: string;
  statusCode: number | "ERROR";
  success: boolean;
  latencyMs: number;
  payload?: JsonObject;
  responsePreview?: string;
  auth: "bearer" | "none";
  aiGenerated: boolean;
  testedAt: string;
  error?: string;
}

export interface SkippedResult {
  kind: "skipped";
  order: number;
  method: string;
  path: string;
  resolvedPath: string;
  reason: string;
  testedAt: string;
}

export type TestResult = ExecutedResult | SkippedResult;

export interface TestProject {
  slug: string;
  name: string;
}

export interface TestSession {
  project: TestProject;
  startedAt: string;
  finishedAt: string;
  results: TestResult[];
}

export interface SessionSummary {
  tested: number;
  passed: number;
  failed: number;
  skipped: number;
}

export function summarize(session: Pick<TestSession, "results">): SessionSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of session.results) {
    if (result.kind === "skipped") {
      skipped += 1;
    } else if (result.success) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  return { tested: passed + failed + skipped, passed, failed, skipped };
}
