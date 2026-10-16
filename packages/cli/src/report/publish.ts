import { TestSession, summarize } from "../domain/session.js";
import { ReportStore } from "./store.js";

export interface PublishReceipt {
  sessionId: string;
  published: number;
  reportUrl?: string;
}

export type PublishOutcome =
  | { status: "published"; receipt: PublishReceipt }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/** Write a session to the store: project → session → results → close. */
export async function publishSession(
  session: TestSession,
  store: ReportStore | null,
  filter?: { method?: string; path?: string },
): Promise<PublishOutcome> {
  if (!store) {
    return {
      status: "skipped",
      reason: "No Supabase credentials. Run `sonic-point init` to configure publishing.",
    };
  }

  const results = session.results.filter((result) => {
    if (filter?.method && result.method !== filter.method.toUpperCase()) return false;
    if (filter?.path && normalize(result.path) !== normalize(filter.path)) return false;
    return true;
  });

  if (results.length === 0) {
    return { status: "skipped", reason: "No cached results matched the requested filter." };
  }

  try {
    const project = await store.upsertProject(session.project.slug, session.project.name);
    const opened = await store.openSession(project.id, session.startedAt);
    const published = await store.appendResults(project.id, opened.id, results);
    await store.closeSession(opened.id, { finishedAt: session.finishedAt, ...summarize({ results }) });

    return {
      status: "published",
      receipt: { sessionId: opened.id, published, reportUrl: store.reportUrl(opened.id) },
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown publish failure.",
    };
  }
}

function normalize(routePath: string): string {
  return routePath === "/" ? routePath : routePath.replace(/\/+$/, "") || "/";
}
