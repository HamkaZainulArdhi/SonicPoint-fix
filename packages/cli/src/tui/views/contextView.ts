// Context report shaping for the REPL — maps pure Stage-4 context rows
// (scan/contextReport.ts) to transcript tones. No business logic here.

import { KnowledgeGraph } from "../../domain/graph.js";
import { ContextRowKind, formatContextGraph } from "../../scan/reports/formatContext.js";
import { LineTone, OutputLine } from "../repl/transcript.js";

const KIND_TONE: Record<ContextRowKind, LineTone> = {
  header: "green",
  blank: "default",
  endpoint: "default",
  endpointGap: "yellow",
  divider: "dim",
  detailOk: "green",
  detailNone: "dim",
  empty: "yellow",
  error: "red",
};

/** Build transcript lines for `/context` from a knowledge graph. Pure. */
export function toContextLines(graph: KnowledgeGraph): OutputLine[] {
  return formatContextGraph(graph).map((row) => ({
    text: row.text,
    tone: KIND_TONE[row.kind],
  }));
}
