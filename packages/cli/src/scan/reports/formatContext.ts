// Stage-4 context renderer (pure): KnowledgeGraph -> printable rows.
// No console, no Ink — cli/output.ts prints these, tui/context.ts maps them
// to transcript tones. 100% deterministic, no AI.

import { KnowledgeGraph } from "../../domain/graph.js";

export type ContextRowKind =
  | "header"
  | "blank"
  | "endpoint"
  | "endpointGap"
  | "divider"
  | "detailOk"
  | "detailNone"
  | "empty"
  | "error";

export interface ContextRow {
  text: string;
  kind: ContextRowKind;
}

const DIVIDER = "────────────────────────";

export function formatContextGraph(graph: KnowledgeGraph): ContextRow[] {
  if (graph.endpoints.length === 0) {
    return [{ text: "No endpoints found", kind: "empty" }];
  }

  const rows: ContextRow[] = [
    { text: `Endpoints: ${graph.endpoints.length}`, kind: "header" },
    { text: `${"Nodes:".padEnd(11)}${graph.nodes.length}`, kind: "header" },
    { text: `${"Edges:".padEnd(11)}${graph.edges.length}`, kind: "header" },
    { text: `Unresolved: ${graph.unresolvedCount}`, kind: "header" },
    { text: "", kind: "blank" },
  ];

  for (const endpoint of graph.endpoints) {
    const gaps =
      endpoint.unresolved.length > 0 ? ` [missing: ${endpoint.unresolved.join(", ")}]` : "";

    rows.push({
      text: `${endpoint.method.toUpperCase().padEnd(7)}${endpoint.endpoint}${gaps}`,
      kind: gaps ? "endpointGap" : "endpoint",
    });
    rows.push({ text: DIVIDER, kind: "divider" });
    rows.push(detail("Controller:", endpoint.controller));
    rows.push(detail("Service:", endpoint.service.join(", ")));
    rows.push(detail("Model:", endpoint.model.join(", ")));
    rows.push(detail("Schema:", endpoint.schema));
    rows.push(detail("Auth:", endpoint.authRequired ? "required" : undefined, "not detected"));
    rows.push({ text: "", kind: "blank" });
  }

  return rows;
}

/** Resolved → `✓ Label: value`, absent → `◯ Label: none|not detected`. */
function detail(label: string, value: string | undefined, absentText = "none"): ContextRow {
  if (value) {
    return { text: `  ✓ ${label.padEnd(12)}${value}`, kind: "detailOk" };
  }

  return { text: `  ◯ ${label.padEnd(12)}${absentText}`, kind: "detailNone" };
}
