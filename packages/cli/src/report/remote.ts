// Remote publish: send the whole session to the platform BE
// (POST /api/report). The CLI holds no Supabase key — service_role lives
// server-side on Vercel. The BE stores passed, failed and skipped results
// and returns the shareable URL.

import { TestSession } from "../domain/session.js";
import { PublishOutcome } from "./publish.js";

export async function publishViaPlatform(
  session: TestSession,
  platformUrl: string,
  filter?: { method?: string; path?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<PublishOutcome> {
  try {
    const res = await fetchImpl(`${platformUrl.replace(/\/+$/, "")}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, filter }),
    });

    if (!res.ok) {
      return { status: "failed", reason: `Platform ${res.status}. Is ${platformUrl} deployed?` };
    }

    const data = (await res.json()) as PublishOutcome & {
      receipt?: { sessionId: string; published: number; reportUrl?: string };
    };

    if (data.status === "published" || data.status === "skipped") return data;
    return { status: "failed", reason: (data as { reason?: string }).reason ?? "Unknown platform failure." };
  } catch {
    return { status: "failed", reason: `Cannot reach platform ${platformUrl}. Check your connection.` };
  }
}
