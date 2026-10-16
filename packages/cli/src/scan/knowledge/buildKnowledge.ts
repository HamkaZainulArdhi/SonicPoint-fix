// Backend knowledge pipeline: endpoint → controller → services → models.
// Each stage either resolves with evidence or records an "unresolved" gap.

import path from "node:path";
import {
  EndpointContext,
  KnowledgeEdge,
  KnowledgeEvidence,
  KnowledgeGraph,
  KnowledgeNode,
} from "../../domain/graph.js";
import { Endpoint, SourceLocation } from "../../domain/endpoint.js";
import { SchemaDefinition } from "../../domain/schema.js";
import { scanEndpoints } from "../routes/scanEndpoints.js";
import { scanSchemas } from "../schemas/scanSchemas.js";
import { resolveImportFile } from "../routes/resolveTree.js";
import { FileSymbols, ImportSpecifier, SymbolDefinition, indexProject } from "./indexSymbols.js";

type Index = Map<string, FileSymbols>;

export function buildKnowledgeGraph(rootDir: string): KnowledgeGraph {
  const endpoints = scanEndpoints(rootDir);
  const schemas = scanSchemas(rootDir).flatMap((file) => file.schemas);
  const index = indexProject(rootDir);

  const graph: KnowledgeGraph = { endpoints: [], nodes: [], edges: [], unresolvedCount: 0 };
  const unseen = new Set<string>();
  const store = createStore(graph);

  for (const endpoint of endpoints) {
    const context = traceEndpoint(endpoint, schemas, index, store);

    for (const gap of context.unresolved) {
      unseen.add(`${endpoint.method} ${endpoint.path}:${gap}`);
    }

    graph.endpoints.push(context);
  }

  graph.unresolvedCount = unseen.size;
  return graph;
}

function traceEndpoint(
  endpoint: Endpoint,
  schemas: SchemaDefinition[],
  index: Index,
  store: NodeStore,
): EndpointContext {
  const context: EndpointContext = {
    endpoint: endpoint.path,
    method: endpoint.method,
    service: [],
    model: [],
    middlewares: endpoint.middlewares,
    authRequired: false,
    unresolved: [],
  };

  const endpointNode = store.node("endpoint", `${endpoint.method} ${endpoint.path}`);

  const schema = (endpoint.validationSchemas ?? [])
    .map((name) => schemas.find((s) => normalize(s.name) === normalize(name)))
    .find((match) => match !== undefined);

  if (schema) {
    const schemaNode = store.node("schema", schema.name);
    store.edge(endpointNode, schemaNode, "validates_with", {
      reason: "explicit-validation-middleware",
      sourceSymbol: schema.name,
      sourceLocation: endpoint.sourceLocation,
      confidence: 100,
    });
    context.schema = schema.name;
  } else if (isWriteMethod(endpoint.method)) {
    context.unresolved.push("schema");
  }

  if (isAuthMiddleware(endpoint.middlewares)) {
    const authNode = store.node("middleware", "auth");
    store.edge(endpointNode, authNode, "requires_auth", {
      reason: "auth-middleware-name",
      sourceSymbol: "auth",
      sourceLocation: endpoint.sourceLocation,
      confidence: 80,
    });
    context.authRequired = true;
  }

  const controller = resolveController(endpoint, index);

  if (!controller) {
    context.unresolved.push("controller");
    if (isWriteMethod(endpoint.method)) context.unresolved.push("service", "model");
    return context;
  }

  const controllerNode = store.node("controller", controller.label);
  store.edge(endpointNode, controllerNode, "handled_by", controller.evidence);
  context.controller = controller.label;

  const services = new Set<string>();
  const models = new Set<string>();

  traceCalls(controllerNode, controller.definition, controller.file, index, store, {
    visited: new Set(),
    services,
    models,
  });

  context.service = [...services];
  context.model = [...models];

  if (services.size === 0) context.unresolved.push("service");
  if (models.size === 0) context.unresolved.push("model");

  return context;
}

interface ResolvedDefinition {
  label: string;
  file: string;
  definition: SymbolDefinition;
  evidence: KnowledgeEvidence;
}

function resolveController(endpoint: Endpoint, index: Index): ResolvedDefinition | null {
  if (!endpoint.controller) return null;

  const routeFile = endpoint.sourceFile;
  const symbols = index.get(routeFile);
  const root = endpoint.controller.split(".")[0];
  const ref = symbols?.importRefs[root];

  const evidence = (confidence: number): KnowledgeEvidence => ({
    reason: "route-handler-reference",
    sourceSymbol: endpoint.controller as string,
    sourceLocation: endpoint.sourceLocation,
    confidence,
  });

  const direct = resolveExpression(routeFile, endpoint.controller, ref, index);
  if (direct) {
    return { ...direct, label: endpoint.controller, evidence: evidence(92) };
  }

  const importedBase = ref?.imported ?? endpoint.controller;
  if (importedBase !== endpoint.controller) {
    const imported = searchDefinition(importedBase, ref, index);
    if (imported) {
      return { ...imported, label: importedBase, evidence: evidence(92) };
    }
  }

  const fallback = searchDefinition(endpoint.controller, ref, index);
  if (fallback) {
    return { ...fallback, evidence: evidence(92) };
  }

  return null;
}

function resolveExpression(
  file: string,
  expression: string,
  ref: ImportSpecifier | undefined,
  index: Index,
): Omit<ResolvedDefinition, "evidence"> | null {
  const local = lookup(index.get(file), expression, ref);
  if (local) {
    return { label: local.name, file, definition: local };
  }

  if (!ref) {
    return searchDefinition(expression, undefined, index);
  }

  const target = resolveImportFile(file, ref.source);
  const targetSymbols = target ? index.get(path.resolve(target)) ?? index.get(target) : undefined;
  const imported = targetSymbols ? lookup(targetSymbols, expression, ref) : undefined;

  if (imported && target) {
    return { label: imported.name, file: target, definition: imported };
  }

  return searchDefinition(expression, ref, index);
}

function searchDefinition(
  expression: string,
  ref: ImportSpecifier | undefined,
  index: Index,
): Omit<ResolvedDefinition, "evidence"> | null {
  for (const symbols of index.values()) {
    const found = lookup(symbols, expression, ref);
    if (found) {
      return { label: found.name, file: symbols.file, definition: found };
    }
  }

  return null;
}

/** Find a definition matching an expression like `lahanController.createLahan`. */
function lookup(
  symbols: FileSymbols | undefined,
  expression: string,
  ref?: ImportSpecifier,
): SymbolDefinition | null {
  if (!symbols) return null;

  const candidates = candidateNames(expression, ref);

  return symbols.definitions.find((def) => candidates.has(normalize(def.name))) ?? null;
}

function candidateNames(expression: string, ref?: ImportSpecifier): Set<string> {
  const names = new Set<string>();
  const parts = expression.split(".").filter(Boolean);

  const add = (value: string | undefined) => {
    if (value?.trim()) names.add(normalize(value));
  };

  add(expression);
  if (parts.length > 0) {
    add(parts[parts.length - 1]);
    add(parts[0]);
  }
  if (parts.length > 1) add(parts.slice(1).join("."));

  if (ref?.imported) {
    add(ref.imported);
    const leaf = ref.imported.split(".").pop();
    add(leaf);
  }

  if (ref?.kind === "default" && parts.length > 0) {
    add(`default.${parts[parts.length - 1]}`);
  }

  return names;
}

interface TraceState {
  visited: Set<string>;
  services: Set<string>;
  models: Set<string>;
}

function traceCalls(
  fromNode: string,
  definition: SymbolDefinition,
  file: string,
  index: Index,
  store: NodeStore,
  state: TraceState,
): void {
  const key = `${file}:${definition.name}`;
  if (state.visited.has(key)) return;
  state.visited.add(key);

  const symbols = index.get(file);

  for (const call of definition.calls) {
    const root = call.expression.split(".")[0];
    const ref = symbols?.importRefs[root];

    const model = inferModel(call.expression, ref);
    if (model) {
      linkModel(fromNode, model, call.expression, call.location, store, state);
      continue;
    }

    const service = resolveExpression(file, call.expression, ref, index);
    if (!service) continue;

    const serviceNode = store.node("service", service.label);
    const isControllerCall = fromNode.startsWith("controller:");
    store.edge(fromNode, serviceNode, "calls", {
      reason: isControllerCall ? "controller-service-call" : "service-service-call",
      sourceSymbol: call.expression,
      sourceLocation: call.location,
      confidence: 88,
    });
    state.services.add(service.label);

    traceCalls(serviceNode, service.definition, service.file, index, store, state);
  }
}

function linkModel(
  fromNode: string,
  model: { label: string; confidence: number },
  expression: string,
  location: SourceLocation | undefined,
  store: NodeStore,
  state: TraceState,
): void {
  const modelNode = store.node("model", model.label);

  for (const other of state.models) {
    if (other === model.label) continue;
    store.edge(store.node("model", other), modelNode, "related_to", {
      reason: "entity-access",
      sourceSymbol: expression,
      sourceLocation: location,
      confidence: 55,
    });
  }

  store.edge(fromNode, modelNode, "uses_model", {
    reason: "model-method-call",
    sourceSymbol: expression,
    sourceLocation: location,
    confidence: model.confidence,
  });

  state.models.add(model.label);
}

function inferModel(
  expression: string,
  ref?: ImportSpecifier,
): { label: string; confidence: number } | null {
  const parts = expression.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  const [root] = parts;
  const tail = parts[parts.length - 1];

  if (root === "prisma" || root === "db") {
    const entity = parts[1];
    if (!entity) return null;
    return { label: capitalize(entity.replace(/Model$/i, "")), confidence: 86 };
  }

  if (/(service|controller|repository|repo|usecase|handler)$/i.test(root)) return null;
  if (/Model$/.test(root)) return { label: root.replace(/Model$/, ""), confidence: 90 };
  if (/^[A-Z]/.test(root)) return { label: root, confidence: 82 };
  if (ref?.imported && /^[A-Z]/.test(ref.imported)) {
    return { label: ref.imported, confidence: 76 };
  }

  if (parts.length > 1 && /^[a-z]/.test(parts[1])) {
    const write = /^(create|insert|update|delete|remove|save|upsert|set|patch)/i.test(tail);
    return { label: capitalize(parts[1].replace(/Model$/i, "")), confidence: write ? 72 : 70 };
  }

  return null;
}

interface NodeStore {
  node(type: "endpoint" | "controller" | "service" | "model" | "schema" | "middleware", label: string): string;
  edge(from: string, to: string, type: KnowledgeEdge["type"], evidence?: KnowledgeEvidence): void;
}

function createStore(graph: KnowledgeGraph): NodeStore {
  const nodeKeys = new Set<string>();
  const edgeKeys = new Set<string>();

  return {
    node(type, label) {
      const id = `${type}:${label.toLowerCase()}`;
      const key = `${type}:${label}`;

      if (!nodeKeys.has(key)) {
        nodeKeys.add(key);
        const node: KnowledgeNode = { id, type, label };
        graph.nodes.push(node);
      }

      return id;
    },

    edge(from, to, type, evidence) {
      const key = `${type}:${from}->${to}`;
      if (edgeKeys.has(key)) return;

      edgeKeys.add(key);
      graph.edges.push({ from, to, type, evidence });
    },
  };
}

function isWriteMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

function isAuthMiddleware(middlewares: string[]): boolean {
  return middlewares.some((name) => /(auth|jwt|passport|token|login)/i.test(name));
}

function normalize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
