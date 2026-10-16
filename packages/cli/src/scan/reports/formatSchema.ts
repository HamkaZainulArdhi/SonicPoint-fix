// Stage-4 renderer (pure): ApiGraph -> printable rows for body endpoints.
// No console, no Ink — cli/output.ts prints these, tui/schema.ts maps them
// to transcript tones. 100% deterministic, no AI.

import { ApiEndpointNode, ApiGraph } from "../schemas/buildApiGraph.js";
import { SchemaProperty } from "../../domain/schema.js";

export type ReportRowKind =
  | "header"
  | "blank"
  | "endpoint"
  | "divider"
  | "schema"
  | "schemaUnknown"
  | "section"
  | "required"
  | "optional"
  | "empty"
  | "error";

export interface ReportRow {
  text: string;
  kind: ReportRowKind;
}

const DIVIDER = "────────────────────────";

function isWriteMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === "POST" || upper === "PUT" || upper === "PATCH";
}

/** Filter only endpoints that need a body (POST/PUT/PATCH). */
export function bodyEndpointNodes(graph: ApiGraph): ApiEndpointNode[] {
  return graph.endpoints.filter((node) => isWriteMethod(node.endpoint.method));
}

export function formatBodyEndpoints(graph: ApiGraph): ReportRow[] {
  const nodes = bodyEndpointNodes(graph);

  if (nodes.length === 0) {
    return [{ text: "No endpoints found", kind: "empty" }];
  }

  const rows: ReportRow[] = [
    { text: `✔ Found ${nodes.length} body endpoints`, kind: "header" },
    { text: "", kind: "blank" },
  ];

  for (const node of nodes) {
    rows.push({ text: `${node.endpoint.method.toUpperCase().padEnd(7)}${node.endpoint.path}`, kind: "endpoint" });
    rows.push({ text: DIVIDER, kind: "divider" });

    if (node.schema) {
      rows.push({ text: `Schema: ${node.schema.name}`, kind: "schema" });
    } else {
      rows.push({ text: "Schema: unknown", kind: "schemaUnknown" });
    }

    rows.push({ text: "", kind: "blank" });

    const required = (node.schema?.properties ?? []).filter((prop) => prop.required);
    const optional = (node.schema?.properties ?? []).filter((prop) => !prop.required);
    const width = Math.max(0, ...required.map((prop) => prop.name.length), ...optional.map((prop) => prop.name.length));

    rows.push({ text: "Required:", kind: "section" });

    if (required.length === 0) {
      rows.push({ text: "  (none)", kind: "required" });
    } else {
      for (const prop of required) {
        rows.push({ text: `✓ ${prop.name.padEnd(width)} ${formatField(prop)}`, kind: "required" });
      }
    }

    rows.push({ text: "", kind: "blank" });
    rows.push({ text: "Optional:", kind: "section" });

    if (optional.length === 0) {
      rows.push({ text: "  (none)", kind: "optional" });
    } else {
      for (const prop of optional) {
        rows.push({ text: `◯ ${prop.name.padEnd(width)} ${formatField(prop)}`, kind: "optional" });
      }
    }

    rows.push({ text: "", kind: "blank" });
  }

  return rows;
}

/** `string [email, min: 8]` — core constraint format kept (`min: 8`, not `min(8)`). */
export function formatField(prop: SchemaProperty): string {
  const extras = [
    ...(prop.enumValues && prop.enumValues.length > 0 ? [prop.enumValues.map((value) => String(value)).join("|")] : []),
    ...(prop.constraints ?? []),
    ...(prop.formats ?? []),
  ];

  return extras.length > 0 ? `${prop.type} [${extras.join(", ")}]` : prop.type;
}
