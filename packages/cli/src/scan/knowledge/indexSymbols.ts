// Project-wide symbol index: every file's imports, definitions and the
// calls inside each definition. Built once, queried by the knowledge
// pipeline and snippet collector.

import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { SourceLocation } from "../../domain/endpoint.js";
import { findCodeFiles } from "../core/findFiles.js";
import { parseFile } from "../core/parseAst.js";
import { dottedName } from "../routes/collectRoutes.js";

const traverse = traverseModule.default;

export interface SymbolCall {
  expression: string;
  location?: SourceLocation;
}

export type DefinitionKind = "function" | "object-method" | "variable";

export interface SymbolDefinition {
  name: string;
  kind: DefinitionKind;
  location?: SourceLocation;
  calls: SymbolCall[];
}

export interface ImportSpecifier {
  source: string;
  imported: string | null;
  kind: "default" | "named" | "namespace" | "require";
}

export interface FileSymbols {
  file: string;
  imports: Record<string, string>;
  importRefs: Record<string, ImportSpecifier>;
  definitions: SymbolDefinition[];
}

export type SymbolIndex = Map<string, FileSymbols>;

export function indexProject(rootDir: string): SymbolIndex {
  const index: SymbolIndex = new Map();

  for (const file of findCodeFiles(rootDir)) {
    const ast = parseFile(file);
    if (!ast) continue;

    index.set(file, collectSymbols(file, ast));
  }

  return index;
}

function collectSymbols(file: string, ast: t.File): FileSymbols {
  const symbols: FileSymbols = { file, imports: {}, importRefs: {}, definitions: [] };

  traverse(ast, {
    ImportDeclaration(path) {
      for (const specifier of path.node.specifiers) {
        if (!t.isIdentifier(specifier.local)) continue;

        symbols.imports[specifier.local.name] = path.node.source.value;
        symbols.importRefs[specifier.local.name] = {
          source: path.node.source.value,
          imported:
            specifier.type === "ImportSpecifier"
              ? t.isIdentifier(specifier.imported)
                ? specifier.imported.name
                : specifier.imported.value
              : null,
          kind:
            specifier.type === "ImportDefaultSpecifier"
              ? "default"
              : specifier.type === "ImportNamespaceSpecifier"
                ? "namespace"
                : "named",
        };
      }
    },

    FunctionDeclaration(path) {
      if (!path.node.id) return;

      symbols.definitions.push({
        name: path.node.id.name,
        kind: "function",
        location: locationOf(file, path.node),
        calls: callsIn(path.node.body, file),
      });
    },

    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!t.isIdentifier(id) || !init) return;

      if (t.isObjectExpression(init)) {
        for (const def of objectMethods(id.name, init, file)) {
          symbols.definitions.push(def);
        }
      } else if (t.isFunctionExpression(init) || t.isArrowFunctionExpression(init)) {
        symbols.definitions.push({
          name: id.name,
          kind: "function",
          location: locationOf(file, init),
          calls: callsIn(init.body, file),
        });
      }
    },

    ExportDefaultDeclaration(path) {
      if (t.isObjectExpression(path.node.declaration)) {
        for (const def of objectMethods("default", path.node.declaration, file)) {
          symbols.definitions.push(def);
        }
      }
    },
  });

  return symbols;
}

function objectMethods(base: string, obj: t.ObjectExpression, file: string): SymbolDefinition[] {
  const defs: SymbolDefinition[] = [];

  for (const prop of obj.properties) {
    const isMethod = t.isObjectMethod(prop);
    const isFnProp =
      t.isObjectProperty(prop) &&
      (t.isFunctionExpression(prop.value) || t.isArrowFunctionExpression(prop.value));

    if (!isMethod && !isFnProp) continue;

    const key = t.isObjectMethod(prop) ? prop.key : (prop as t.ObjectProperty).key;
    const name = t.isIdentifier(key) ? key.name : t.isStringLiteral(key) ? key.value : null;
    if (!name) continue;

    const body = t.isObjectMethod(prop) ? prop.body : (prop.value as t.FunctionExpression).body;

    defs.push({
      name: `${base}.${name}`,
      kind: "object-method",
      location: locationOf(file, prop),
      calls: callsIn(body, file),
    });
  }

  return defs;
}

function callsIn(node: t.Node, file: string): SymbolCall[] {
  const calls: SymbolCall[] = [];

  walk(node, (child) => {
    if (!t.isCallExpression(child)) return;

    const expression = dottedName(child.callee);
    if (!expression) return;

    calls.push({ expression, location: locationOf(file, child) });
  });

  return calls.sort((a, b) => {
    const line = (a.location?.line ?? 0) - (b.location?.line ?? 0);
    if (line !== 0) return line;
    return (a.location?.column ?? 0) - (b.location?.column ?? 0);
  });
}

function walk(node: t.Node, visit: (node: t.Node) => void): void {
  visit(node);

  for (const key of Object.keys(node) as Array<keyof typeof node>) {
    if (key === "loc" || key === "start" || key === "end" || key === "leadingComments" || key === "innerComments" || key === "trailingComments") {
      continue;
    }

    const value: unknown = node[key];

    if (Array.isArray(value)) {
      for (const child of value) {
        if (isNode(child)) walk(child, visit);
      }
    } else if (isNode(value)) {
      walk(value, visit);
    }
  }
}

function isNode(value: unknown): value is t.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}

function locationOf(file: string, node: t.Node): SourceLocation | undefined {
  if (!node.loc) return undefined;
  return { file, line: node.loc.start.line, column: node.loc.start.column };
}
