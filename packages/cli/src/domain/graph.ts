// Core domain: backend knowledge graph (endpoint → controller →
// services → models) with evidence for every link.

import { SourceLocation } from "./endpoint.js";

export type KnowledgeNodeType =
  | "endpoint"
  | "controller"
  | "service"
  | "model"
  | "schema"
  | "middleware";

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
}

export interface KnowledgeEvidence {
  reason: string;
  sourceSymbol: string;
  sourceLocation?: SourceLocation;
  confidence: number;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  type: "handled_by" | "calls" | "uses_model" | "related_to" | "validates_with" | "requires_auth";
  evidence?: KnowledgeEvidence;
}

export interface EndpointContext {
  endpoint: string;
  method: string;
  schema?: string;
  controller?: string;
  service: string[];
  model: string[];
  middlewares: string[];
  authRequired: boolean;
  unresolved: string[];
}

export interface KnowledgeGraph {
  endpoints: EndpointContext[];
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  unresolvedCount: number;
}
