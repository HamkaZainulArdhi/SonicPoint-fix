// Schema report shaping for the REPL — maps pure Stage-4 report rows
// (scan/schemaReport.ts) to transcript tones. No business logic here.

import { ApiGraph } from "../../scan/schemas/buildApiGraph.js";
import { ReportRowKind, formatBodyEndpoints } from "../../scan/reports/formatSchema.js";
import { LineTone, OutputLine } from "../repl/transcript.js";

const KIND_TONE: Record<ReportRowKind, LineTone> = {
  header: "green",
  blank: "default",
  endpoint: "default",
  divider: "dim",
  schema: "cyan",
  schemaUnknown: "yellow",
  section: "default",
  required: "green",
  optional: "dim",
  empty: "yellow",
  error: "red",
};

/** Build transcript lines for `/schema` from an API graph. Pure. */
export function toSchemaLines(graph: ApiGraph): OutputLine[] {
  return formatBodyEndpoints(graph).map((row) => ({
    text: row.text,
    tone: KIND_TONE[row.kind],
  }));
}
