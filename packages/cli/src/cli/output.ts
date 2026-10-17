// Every console interaction lives here. Domain/run/report modules
// never print — commands call these helpers with data.

import chalk from "chalk";
import Table from "cli-table3";
import boxen from "boxen";
import logSymbols from "log-symbols";
import { Endpoint } from "../domain/endpoint.js";
import { SampledRef } from "../domain/ref.js";
import { SchemaFile } from "../domain/schema.js";
import { ApiGraph } from "../scan/schemas/buildApiGraph.js";
import { ReportRow, formatBodyEndpoints } from "../scan/reports/formatSchema.js";
import { ContextRow, formatContextGraph } from "../scan/reports/formatContext.js";
import { KnowledgeGraph } from "../domain/graph.js";
import { TestResult, TestSession, summarize } from "../domain/session.js";
import { refNotice } from "../run/refs.js";
import { PublishOutcome } from "../report/publish.js";

export function banner(title: string): void {
  console.log(`\n ${title}\n`);
}

export function fail(message: string): void {
  console.error(chalk.red(message));
  process.exitCode = 1;
}

export function warn(message: string): void {
  console.log(chalk.yellow(message));
}

export function renderEndpoints(endpoints: Endpoint[]): void {
  const byFile = new Map<string, Endpoint[]>();

  for (const endpoint of endpoints) {
    const group = byFile.get(endpoint.sourceFile) ?? [];
    group.push(endpoint);
    byFile.set(endpoint.sourceFile, group);
  }

  console.log(`\n✔ Found ${byFile.size} route files\n`);

  for (const [file, group] of byFile) {
    console.log(chalk.cyan(`📂 ${file}`));

    for (const endpoint of group) {
      console.log(`${endpoint.method.padEnd(8)} ${endpoint.path}`);
    }

    console.log();
  }
}

export function renderResultTable(results: TestResult[]): void {
  const table = new Table({
    head: [chalk.white.bold("METHOD"), chalk.white.bold("ENDPOINT"), chalk.white.bold("STATUS")],
    colWidths: [10, 50, 15],
    wordWrap: true,
    style: { head: [], border: ["cyan"] },
  });

  for (const result of results) {
    const status =
      result.kind === "skipped"
        ? { label: `${logSymbols.warning} (SKIPPED)`, color: chalk.yellow }
        : result.success
          ? { label: `${logSymbols.success} (${result.statusCode})`, color: chalk.green }
          : { label: `${logSymbols.error} (${result.statusCode})`, color: chalk.red };

    table.push([
      chalk.cyan(result.method),
      chalk.white(result.resolvedPath),
      status.color(status.label),
    ]);
  }

  console.log();
  console.log(table.toString());
}

export function renderResultDetail(result: TestResult): void {
  if (result.kind === "skipped") {
    console.log();
    console.log(chalk.yellow(`Skipped ${result.method} ${result.path}: ${result.reason}`));
    return;
  }

  console.log();

  if (result.payload) {
    console.log(chalk.whiteBright.bold("Request:"));
    for (const line of JSON.stringify(result.payload, null, 2).split("\n")) {
      console.log(chalk.yellow(line));
    }
  }

  if (result.responsePreview !== undefined) {
    console.log(chalk.whiteBright.bold("Response:"));
    for (const line of String(result.responsePreview).split("\n")) {
      console.log(chalk.greenBright(line));
    }
  }

  if (result.error) {
    console.log(chalk.whiteBright.bold("Error:"));
    console.log(chalk.redBright(result.error));
  }

  console.log();
}

export function renderSession(session: TestSession): void {
  const summary = summarize(session);

  renderResultTable(session.results);

  console.log(
    chalk.white(
      `\nTested ${summary.tested}: ${chalk.green(`${summary.passed} passed`)} · ${chalk.red(`${summary.failed} failed`)} · ${chalk.yellow(`${summary.skipped} skipped`)}\n`,
    ),
  );

  for (const result of session.results) {
    renderResultDetail(result);
  }
}

export function renderSchemas(files: SchemaFile[]): void {
  if (files.length === 0) {
    warn("No validation schemas found.");
    return;
  }

  for (const file of files) {
    console.log(chalk.cyan(`\n📦 ${file.filePath} (${file.framework})`));

    for (const schema of file.schemas) {
      console.log(chalk.white.bold(`\n  ${schema.name}`));

      for (const prop of schema.properties) {
        const flags = [
          prop.type,
          prop.required ? "required" : "optional",
          ...(prop.formats ?? []),
          ...(prop.constraints ?? []),
        ].join(", ");

        console.log(`    - ${prop.name}: ${flags}`);
      }
    }
  }

  console.log();
}

/**
 * Stage-4 schema report: body endpoints (POST/PUT/PATCH) with their linked
 * validation schema, Required (✓) vs Optional (◯) fields. Same rows the
 * REPL `/schema` shows — single formatter, two sinks.
 */
export function renderSchemaReport(graph: ApiGraph): void {
  for (const row of formatBodyEndpoints(graph)) {
    console.log(paintSchemaRow(row));
  }
}

function paintSchemaRow(row: ReportRow): string {
  switch (row.kind) {
    case "header":
    case "required":
      return chalk.green(row.text);
    case "divider":
    case "optional":
      return chalk.dim(row.text);
    case "schema":
      return chalk.cyan(row.text);
    case "schemaUnknown":
    case "empty":
      return chalk.yellow(row.text);
    case "error":
      return chalk.red(row.text);
    default:
      return row.text;
  }
}

/**
 * Stage-4 context report: counts + per-endpoint controller/service/model/auth.
 * Same rows the REPL `/context` shows — single formatter, two sinks.
 * The `[missing: …]` gap suffix stays yellow inline (CLI-only nicety;
 * the TUI keeps the same text in one tone).
 */
export function renderContextReport(graph: KnowledgeGraph): void {
  for (const row of formatContextGraph(graph)) {
    console.log(paintContextRow(row));
  }
}

function paintContextRow(row: ContextRow): string {
  switch (row.kind) {
    case "header":
      return chalk.green(row.text);
    case "endpointGap":
      return chalk.yellow(row.text);
    case "divider":
    case "detailNone":
      return chalk.dim(row.text);
    case "detailOk":
      return chalk.green(row.text);
    case "empty":
      return chalk.yellow(row.text);
    case "error":
      return chalk.red(row.text);
    default:
      return row.text;
  }
}

export function renderKnowledge(graph: KnowledgeGraph): void {
  console.log(chalk.white.bold(`\nEndpoints: ${graph.endpoints.length}`));
  console.log(chalk.white.bold(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`));
  console.log(chalk.white(`Unresolved: ${graph.unresolvedCount}\n`));

  for (const endpoint of graph.endpoints) {
    const gaps = endpoint.unresolved.length > 0 ? chalk.yellow(` [missing: ${endpoint.unresolved.join(", ")}]`) : "";

    console.log(`${endpoint.method} ${endpoint.endpoint}${gaps}`);

    if (endpoint.controller) console.log(`  controller: ${endpoint.controller}`);
    if (endpoint.schema) console.log(`  schema: ${endpoint.schema}`);
    if (endpoint.service.length > 0) console.log(`  services: ${endpoint.service.join(", ")}`);
    if (endpoint.model.length > 0) console.log(`  models: ${endpoint.model.join(", ")}`);
  }

  console.log();
}

export function renderPublishOutcome(outcome: PublishOutcome): boolean {
  if (outcome.status === "published") {
    console.log();
    console.log(chalk.green(`✔ Published ${outcome.receipt.published} endpoints via supabase.`));

    if (outcome.receipt.reportUrl) {
      console.log(chalk.cyan(`Session Report: ${outcome.receipt.reportUrl}`));
    }

    console.log(chalk.cyan(`Session ID: ${outcome.receipt.sessionId}`));
    return true;
  }

  if (outcome.status === "skipped") {
    warn(outcome.reason);
    return false;
  }

  fail(outcome.reason);
  return false;
}

/**
 * Reference ids captured or refreshed during a run — one dim line each
 * (`↳ refs.item = item-1 (saved)`), printed before the result table.
 */
export function renderRefNotices(notices: SampledRef[]): void {
  for (const notice of notices) {
    console.log(chalk.dim(refNotice(notice)));
  }
}

export function renderWarningBox(lines: string[]): void {
  console.log(
    boxen(`${logSymbols.warning} ${lines.join("\n")}`, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "yellow",
    }),
  );
}
