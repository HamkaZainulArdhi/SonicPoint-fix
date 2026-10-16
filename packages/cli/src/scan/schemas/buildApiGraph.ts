// Links each endpoint to its validation schema (explicit middleware
// reference only — no guessing by name).

import { Endpoint } from "../../domain/endpoint.js";
import { SchemaDefinition } from "../../domain/schema.js";
import { scanEndpoints } from "../routes/scanEndpoints.js";
import { scanSchemas } from "./scanSchemas.js";

export interface EndpointSchemaLink {
  endpointId: string;
  schemaName: string;
  schema: SchemaDefinition;
  confidence: number;
  reason: "explicit-validation-middleware";
}

export interface ApiEndpointNode {
  id: string;
  endpoint: Endpoint;
  schemaStatus: "detected" | "none" | "unknown";
  schema?: SchemaDefinition;
  link?: EndpointSchemaLink;
  requiredFields: string[];
}

export interface ApiGraph {
  endpoints: ApiEndpointNode[];
  schemas: SchemaDefinition[];
  links: EndpointSchemaLink[];
}

/** Minimum confidence kept as a link (exact matches score 100; reserved for future fuzzy). */
export const LINK_CONFIDENCE_THRESHOLD = 50;

export function buildApiGraph(rootDir: string): ApiGraph {
  const endpoints = scanEndpoints(rootDir);
  const schemas = scanSchemas(rootDir).flatMap((file) => file.schemas);
  const byName = new Map(schemas.map((schema) => [normalize(schema.name), schema]));
  const links: EndpointSchemaLink[] = [];

  const nodes = endpoints.map((endpoint) => {
    const id = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
    let link: EndpointSchemaLink | undefined;

    for (const name of endpoint.validationSchemas ?? []) {
      const schema = byName.get(normalize(name));

      if (schema) {
        const candidate: EndpointSchemaLink = {
          endpointId: id,
          schemaName: schema.name,
          schema,
          confidence: 100,
          reason: "explicit-validation-middleware",
        };

        if (candidate.confidence >= LINK_CONFIDENCE_THRESHOLD && (!link || candidate.confidence > link.confidence)) {
          link = candidate;
        }
      }
    }

    if (link) links.push(link);

    const schema = link?.schema;
    return {
      id,
      endpoint,
      schema,
      link,
      schemaStatus: schema
        ? "detected"
        : isWriteMethod(endpoint.method)
          ? "unknown"
          : "none",
      requiredFields: (schema?.properties ?? []).filter((prop) => prop.required).map((prop) => prop.name),
    } satisfies ApiEndpointNode;
  });

  return { endpoints: nodes, schemas, links };
}

function isWriteMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

function normalize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
