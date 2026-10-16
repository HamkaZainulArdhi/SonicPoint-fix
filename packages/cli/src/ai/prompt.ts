import { Endpoint } from "../domain/endpoint.js";
import { SchemaDefinition, SchemaProperty } from "../domain/schema.js";

export function buildPayloadPrompt(endpoint: Endpoint, schema: SchemaDefinition): string {
  const required = schema.properties.filter((prop) => prop.required);
  const optional = schema.properties.filter((prop) => !prop.required);

  const lines = [
    "You are generating a realistic API request body.",
    "",
    `Endpoint: ${endpoint.method} ${endpoint.path}`,
    `Schema: ${schema.name}`,
    "",
    "Required fields:",
    ...required.map((prop) => `- ${describe(prop)}`),
    "",
  ];

  if (optional.length > 0) {
    lines.push(
      "Optional fields (choose 1-2 if appropriate):",
      ...optional.map((prop) => `- ${describe(prop)}`),
      "",
    );
  }

  lines.push(
    "Generate a realistic, valid JSON object with all required fields.",
    "For string fields, use realistic values (not placeholders).",
    "For numbers, use realistic positive values.",
    "For dates, use ISO 8601 format.",
    "For UUIDs, generate valid v4 UUIDs.",
    "For emails, generate realistic email addresses.",
    "Return ONLY a valid JSON object. No markdown. No explanations.",
  );

  return lines.join("\n");
}

function describe(prop: SchemaProperty): string {
  let text = `${prop.name}: ${prop.type}`;

  if (prop.enumValues?.length) text += ` (enum: ${prop.enumValues.join(", ")})`;
  if (prop.constraints?.length) text += ` [${prop.constraints.join(", ")}]`;
  if (prop.formats?.length) text += ` (formats: ${prop.formats.join(", ")})`;

  return text;
}
