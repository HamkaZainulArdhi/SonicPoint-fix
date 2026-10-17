// Report shaping for the REPL — pure, no Ink/React/console.
// Mirrors cli/output.ts:renderPublishOutcome as transcript lines.

import { PublishOutcome } from "../../report/publish.js";
import { OutputLine } from "../repl/transcript.js";

export function toReportLines(outcome: PublishOutcome): OutputLine[] {
  if (outcome.status === "published") {
    const lines: OutputLine[] = [
      { text: `✔ Published ${outcome.receipt.published} endpoints via platform.`, tone: "green" },
    ];
    if (outcome.receipt.reportUrl) {
      lines.push({ text: `Session Report: ${outcome.receipt.reportUrl}`, tone: "cyan" });
    }
    lines.push({ text: `Session ID: ${outcome.receipt.sessionId}`, tone: "cyan" });
    return lines;
  }

  if (outcome.status === "skipped") {
    return [{ text: outcome.reason, tone: "yellow" }];
  }

  return [{ text: outcome.reason, tone: "red" }];
}
