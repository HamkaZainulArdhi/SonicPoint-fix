// Validation schema extraction (Joi / Zod / Yup) from `const X = Joi.object({...})`
// style declarations, including chained modifiers (.required(), .min(3), ...).

import fs from "node:fs";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { SchemaDefinition, SchemaFile, SchemaFramework, SchemaProperty } from "../../domain/schema.js";
import { findCodeFiles } from "../core/findFiles.js";
import { parseFile } from "../core/parseAst.js";

const traverse = traverseModule.default;

const SCHEMA_DIRS = ["validation", "validators", "schemas", "schema", "validations"];

const FRAMEWORK_MODULES: Record<SchemaFramework, string[]> = {
  joi: ["joi"],
  zod: ["zod"],
  yup: ["yup"],
};

const FRAMEWORK_ROOTS: Record<SchemaFramework, string[]> = {
  joi: ["Joi", "joi"],
  zod: ["z", "zod"],
  yup: ["Yup", "yup"],
};

/** Scan likely schema directories and extract all schema definitions. */
export function scanSchemas(rootDir: string): SchemaFile[] {
  const results: SchemaFile[] = [];

  for (const file of findCodeFiles(rootDir)) {
    if (!isSchemaPath(rootDir, file)) continue;

    try {
      const code = fs.readFileSync(file, "utf-8");
      const ast = parseFile(file);
      if (!ast) continue;

      const framework = detectFramework(code, ast);
      if (!framework) continue;

      const schemas = extractSchemas(ast, file, framework);
      if (schemas.length > 0) {
        results.push({ framework, filePath: file, schemas });
      }
    } catch (error) {
      // Broken schema files are skipped silently so one bad file cannot
      // abort the whole scan. Opt-in debug via SONIC_DEBUG_SCHEMA=true.
      if (process.env["SONIC_DEBUG_SCHEMA"] === "true") {
        console.error(`[schema] skip ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return results;
}

function isSchemaPath(rootDir: string, file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  const root = rootDir.replace(/\\/g, "/");

  return SCHEMA_DIRS.some((dir) => normalized.startsWith(`${root}/src/${dir}/`));
}

/**
 * Detect the validation framework. Content-string signals first
 * (deterministic, no AST needed): `Joi.` / `from "joi"`, `z.` / `from "zod"`,
 * `Yup.` / `from "yup"`. Falls back to the AST import check.
 */
export function detectFramework(code: string, ast: t.File): SchemaFramework | null {
  if (code.includes("Joi.") || /from\s+['"]joi['"]/.test(code)) return "joi";
  if (code.includes("z.") || /from\s+['"]zod['"]/.test(code)) return "zod";
  if (code.includes("Yup.") || /from\s+['"]yup['"]/.test(code)) return "yup";

  const imported = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path) {
      imported.add(path.node.source.value);
    },
  });

  for (const framework of Object.keys(FRAMEWORK_MODULES) as SchemaFramework[]) {
    if (FRAMEWORK_MODULES[framework].some((mod) => imported.has(mod))) {
      return framework;
    }
  }

  return null;
}

function extractSchemas(ast: t.File, filePath: string, framework: SchemaFramework): SchemaDefinition[] {
  const schemas: SchemaDefinition[] = [];

  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!t.isIdentifier(id)) return;

      const shape = unwrapToObject(init, framework);
      if (!shape) return;

      schemas.push({
        name: id.name,
        framework,
        filePath,
        properties: shape.properties.flatMap((prop) =>
          t.isObjectProperty(prop) ? [readProperty(prop, framework)] : [],
        ).filter((prop): prop is SchemaProperty => prop !== null),
      });
    },
  });

  return schemas;
}

/** Walk `Joi.object({...}).required()` style chains down to the object literal. */
function unwrapToObject(
  node: t.Node | null | undefined,
  framework: SchemaFramework,
): t.ObjectExpression | null {
  let current = node;

  while (t.isCallExpression(current)) {
    const direct = objectArg(current, framework);
    if (direct) return direct;

    if (!t.isMemberExpression(current.callee)) return null;
    current = current.callee.object;
  }

  return null;
}

function objectArg(call: t.CallExpression, framework: SchemaFramework): t.ObjectExpression | null {
  if (!t.isMemberExpression(call.callee) || !t.isIdentifier(call.callee.property)) {
    return null;
  }

  const [firstArg] = call.arguments;

  // yup: Yup.object().shape({...})
  if (
    framework === "yup" &&
    call.callee.property.name === "shape" &&
    t.isObjectExpression(firstArg) &&
    isObjectChain(call.callee.object, framework)
  ) {
    return firstArg;
  }

  if (
    call.callee.property.name === "object" &&
    t.isIdentifier(call.callee.object) &&
    FRAMEWORK_ROOTS[framework].includes(call.callee.object.name) &&
    t.isObjectExpression(firstArg)
  ) {
    return firstArg;
  }

  return null;
}

function isObjectChain(node: t.Node, framework: SchemaFramework): boolean {
  let current: t.Node = node;

  while (t.isCallExpression(current)) {
    const { callee } = current;

    if (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property, { name: "object" }) &&
      t.isIdentifier(callee.object) &&
      FRAMEWORK_ROOTS[framework].includes(callee.object.name)
    ) {
      return true;
    }

    if (!t.isMemberExpression(callee)) return false;
    current = callee.object;
  }

  return false;
}

function readProperty(prop: t.ObjectProperty, framework: SchemaFramework): SchemaProperty | null {
  const name =
    t.isIdentifier(prop.key) ? prop.key.name
    : t.isStringLiteral(prop.key) ? prop.key.value
    : null;

  if (!name) return null;

  const field: SchemaProperty = {
    name,
    type: "any",
    required: framework === "zod",
  };

  if (!t.isCallExpression(prop.value)) return field;

  const chain = chainMethods(prop.value);

  if (chain.length > 0 && isBaseType(chain[0].name)) {
    field.type = chain[0].name;
  }

  for (const method of chain.slice(1)) {
    applyModifier(field, method.name, method.args);
  }

  return field;
}

interface ChainMethod {
  name: string;
  args: t.CallExpression["arguments"];
}

/** Flatten `Joi.string().min(3).required()` into [string, min, required]. */
function chainMethods(call: t.CallExpression): ChainMethod[] {
  const methods: ChainMethod[] = [];
  let current: t.Node = call;

  while (true) {
    if (!t.isCallExpression(current)) break;

    const callee: t.CallExpression["callee"] = current.callee;

    if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) break;

    methods.unshift({ name: callee.property.name, args: current.arguments });
    current = callee.object;
  }

  return methods;
}

function isBaseType(name: string): boolean {
  return ["string", "number", "boolean", "date", "array", "object", "email", "any"].includes(name);
}

function applyModifier(field: SchemaProperty, name: string, args: t.CallExpression["arguments"]): void {
  switch (name) {
    case "required":
      field.required = true;
      return;
    case "optional":
      field.required = false;
      return;
    case "default":
      field.default = literalOf(args[0]);
      field.required = false;
      return;
    case "valid":
    case "oneOf":
      field.enumValues = enumOf(args);
      return;
  }

  if (isFormat(name)) {
    field.formats = [...(field.formats ?? []), normalizeFormat(name)];
    return;
  }

  const constraint = constraintOf(name, args);
  if (constraint) {
    field.constraints = [...(field.constraints ?? []), constraint];
  }
}

function isFormat(name: string): boolean {
  return ["email", "uuid", "guid", "uri", "url", "iso", "isoDate", "alphanum", "integer", "positive", "negative"].includes(name);
}

function normalizeFormat(name: string): string {
  if (name === "guid") return "uuid";
  if (name === "uri") return "url";
  return name;
}

function constraintOf(name: string, args: t.CallExpression["arguments"]): string | null {
  const value = args[0] ? literalOf(args[0]) : undefined;
  if (value === undefined || value === "...") return null;
  const rendered = typeof value === "string" && value !== "..." ? `"${value}"` : String(value);

  switch (name) {
    case "min": return `min: ${rendered}`;
    case "max": return `max: ${rendered}`;
    case "length": return `length: ${rendered}`;
    case "greater": return `> ${rendered}`;
    case "less": return `< ${rendered}`;
    case "pattern":
    case "regex": return `pattern: ${rendered}`;
    default: return null;
  }
}

function literalOf(node: t.Node | undefined): unknown {
  if (!node) return undefined;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  return "...";
}

function enumOf(args: t.CallExpression["arguments"]): Array<string | number | boolean | null> {
  const values: Array<string | number | boolean | null> = [];

  for (const arg of args) {
    const items = t.isArrayExpression(arg) ? arg.elements : [arg];

    for (const item of items) {
      if (!item || !t.isNode(item)) continue;
      const value = literalOf(item);

      if (value !== undefined && value !== "...") {
        values.push(value as string | number | boolean | null);
      }
    }
  }

  return values;
}
