// Test report shaping for the REPL — pure, no Ink/React/console.
// Dual sink of output.ts:renderSession (chalk+table vs transcript tones).

import { summarize, TestResult, TestSession } from "../../domain/session.js";
import { LineTone, OutputLine } from "../repl/transcript.js";

function padMethod(method: string): string {
  return method.padEnd(7);
}

export function toTestLines(session: TestSession): OutputLine[] {
  if (session.results.length === 0) {
    return [{ text: "No endpoints found.", tone: "yellow" }];
  }

  const summary = summarize(session);
  const lines: OutputLine[] = [];
  
  lines.push({ text: "", tone: "default" });
  lines.push({
    text: `Tested ${summary.tested}: ${summary.passed} passed · ${summary.failed} failed · ${summary.skipped} skipped`,
    tone: "green",
  });
  lines.push({ text: "────────────────────────", tone: "dim" });

  for (const result of session.results) {
    if (result.kind === "skipped") {
      lines.push({
        text: `◯ ${padMethod(result.method)} ${result.resolvedPath}  SKIPPED`,
        tone: "yellow",
      });
      lines.push({ text: `  reason: ${result.reason}`, tone: "dim" });
      lines.push({
        text: `  hint: re-run with a concrete id, e.g. /test ${result.method} ${suggestConcrete(result.path)}`,
        tone: "dim",
      });
      lines.push({ text: "", tone: "default" });
      continue;
    }

    const statusLabel = result.success ? `(${result.statusCode}) ✓` : `(${result.statusCode}) ✗`;
    const tone: LineTone = result.success ? "green" : "red";
    lines.push({
      text: `${result.success ? "✓" : "✗"} ${padMethod(result.method)} ${result.resolvedPath}  ${statusLabel}  ${result.latencyMs}ms  auth:${result.auth}${result.aiGenerated ? " ai:gemini" : ""}`,
      tone,
    });
    if (result.payload) {
      lines.push({ text: "", tone: "default" });
      lines.push({ text: "Payload:", tone: "dim" });
      const preview = jsonPreview(result.payload, 6);
      for (const line of preview) lines.push({ text: line, tone: "dim" });
    }
    if (result.responsePreview !== undefined) {
      lines.push({ text: "", tone: "default" });
      lines.push({ text: "Response:", tone: "dim" });
      const preview = String(result.responsePreview).split("\n").slice(0, 8);
      for (const line of preview) lines.push({ text: line, tone: "dim" });
      if (String(result.responsePreview).split("\n").length > 8) {
        lines.push({ text: "… (truncated)", tone: "dim" });
      }
    }
    if (result.error) {
      lines.push({ text: `  error: ${result.error}`, tone: "red" });
    }
    lines.push({ text: "", tone: "default" });
  }

  return lines;
}

function suggestConcrete(template: string): string {
  return template.replace(/:([A-Za-z0-9_]+)/g, "1");
}

function jsonPreview(value: unknown, maxLines: number): string[] {
  const text = JSON.stringify(value, null, 2);
  const lines = text.split("\n");
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines), "…"];
}

export type TestTone = LineTone;

export function toneFor(result: TestResult): LineTone {
  if (result.kind === "skipped") return "yellow";
  return result.success ? "green" : "red";
}
