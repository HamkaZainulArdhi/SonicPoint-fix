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

/** Key for one endpoint inside a working session. */
function resultKey(result: Pick<TestResult, "method" | "path">): string {
  return `${result.method} ${result.path}`;
}

/**
 * One working session: a fresh run merges into the previous session.
 * Key = `METHOD path` (template) — re-testing an endpoint replaces its
 * result in place (latest wins), new endpoints append. Orders are
 * renumbered 1..N and the time window stays the union (earliest start,
 * latest finish) so the session duration stays honest.
 */
export function mergeSessions(previous: TestSession | undefined, next: TestSession): TestSession {
  if (!previous) return next;

  const merged = new Map<string, TestResult>();
  for (const result of previous.results) {
    merged.set(resultKey(result), result);
  }
  for (const result of next.results) {
    merged.set(resultKey(result), result);
  }

  return {
    project: next.project,
    startedAt: previous.startedAt < next.startedAt ? previous.startedAt : next.startedAt,
    finishedAt: previous.finishedAt > next.finishedAt ? previous.finishedAt : next.finishedAt,
    results: [...merged.values()].map((result, index) => ({ ...result, order: index + 1 })),
  };
}
