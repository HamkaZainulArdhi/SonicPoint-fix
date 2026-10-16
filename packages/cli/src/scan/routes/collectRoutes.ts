// Single-pass route fact collector: imports, mounts and endpoints are
// gathered in one traverse per file. Only `router.*` / `app.*` receivers
// are considered (Express convention).

import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { Endpoint, Mount, RouteFile } from "../../domain/endpoint.js";

const traverse = traverseModule.default;

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
]);

const SCHEMA_LIKE = /(schema|validator|validation|dto)$/i;

export function collectRouteFile(file: string, ast: t.File): RouteFile {
  const collected: RouteFile = { file, imports: {}, mounts: [], endpoints: [] };

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;

      for (const specifier of path.node.specifiers) {
        if (!t.isIdentifier(specifier.local)) continue;
        collected.imports[specifier.local.name] = source;
      }
    },

    VariableDeclarator(path) {
      const { id, init } = path.node;

      if (
        t.isIdentifier(id) &&
        t.isCallExpression(init) &&
        t.isIdentifier(init.callee, { name: "require" })
      ) {
        const [source] = init.arguments;

        if (t.isStringLiteral(source)) {
          collected.imports[id.name] = source.value;
        }
      }
    },

    CallExpression(path) {
      collectMount(collected, path.node, file);
      collectDirectEndpoint(collected, path.node, file);
      collectChainedEndpoint(collected, path.node, file);
    },
  });

  return collected;
}

function receiverOf(
  node: t.CallExpression,
): { object: string; method: string } | null {
  if (!t.isMemberExpression(node.callee)) return null;
  const { object, property } = node.callee;

  if (!t.isIdentifier(object) || !t.isIdentifier(property)) return null;

  return { object: object.name, method: property.name };
}

function collectMount(collected: RouteFile, node: t.CallExpression, file: string): void {
  void file;
  const receiver = receiverOf(node);

  if (!receiver || receiver.method !== "use") return;
  if (receiver.object !== "app" && receiver.object !== "router") return;

  const [prefixArg, routerArg] = node.arguments;

  if (t.isStringLiteral(prefixArg) && t.isIdentifier(routerArg)) {
    collected.mounts.push({ prefix: prefixArg.value, variableName: routerArg.name });
  }
}

interface HandlerSplit {
  middlewares: string[];
  schemas: string[];
  controller?: string;
}

function splitHandlers(args: t.CallExpression["arguments"]): HandlerSplit {
  const middlewares: string[] = [];
  const schemas: string[] = [];
  let controller: string | undefined;

  const isLast = (index: number) => index === args.length - 1;

  args.forEach((arg, index) => {
    if (t.isIdentifier(arg)) {
      if (isLast(index)) controller = arg.name;
      else middlewares.push(arg.name);
    } else if (t.isMemberExpression(arg)) {
      const dotted = dottedName(arg);

      if (isLast(index)) controller = dotted ?? undefined;
      else if (dotted) middlewares.push(dotted);
    } else if (t.isCallExpression(arg)) {
      const name = callName(arg);

      if (name) middlewares.push(name);
      schemas.push(...schemaNamesInCall(arg));
    }
  });

  return { middlewares, schemas, controller };
}

function collectDirectEndpoint(
  collected: RouteFile,
  node: t.CallExpression,
  file: string,
): void {
  const receiver = receiverOf(node);

  if (!receiver || receiver.object !== "router" && receiver.object !== "app") return;
  if (!HTTP_METHODS.has(receiver.method.toLowerCase())) return;

  const [pathArg, ...handlers] = node.arguments;

  if (!t.isStringLiteral(pathArg)) return;

  const split = splitHandlers(handlers);

  collected.endpoints.push({
    method: receiver.method.toUpperCase(),
    path: pathArg.value,
    sourceFile: file,
    middlewares: split.middlewares,
    validationSchemas: split.schemas,
    controller: split.controller,
    sourceLocation: locationOf(file, node),
  });
}

function collectChainedEndpoint(
  collected: RouteFile,
  node: t.CallExpression,
  file: string,
): void {
  if (!t.isMemberExpression(node.callee) || !t.isIdentifier(node.callee.property)) {
    return;
  }

  const method = node.callee.property.name;
  if (!HTTP_METHODS.has(method.toLowerCase())) return;

  // Unwrap `router.route("/p").get(..).post(..)` to the root route() call,
  // so every link in a multi-method chain is collected with its own method.
  const routePath = rootRoutePath(node);
  if (!routePath) return;

  const split = splitHandlers(node.arguments);

  collected.endpoints.push({
    method: method.toUpperCase(),
    path: routePath,
    sourceFile: file,
    middlewares: split.middlewares,
    validationSchemas: split.schemas,
    controller: split.controller,
    sourceLocation: locationOf(file, node),
  });
}

function rootRoutePath(node: t.CallExpression): string | null {
  let current: t.Node = node;

  while (t.isCallExpression(current) && t.isMemberExpression(current.callee)) {
    const object: t.Node = current.callee.object;

    if (
      t.isCallExpression(object) &&
      t.isMemberExpression(object.callee) &&
      t.isIdentifier(object.callee.object, { name: "router" }) &&
      t.isIdentifier(object.callee.property, { name: "route" })
    ) {
      const [routeArg] = object.arguments;
      return t.isStringLiteral(routeArg) ? routeArg.value : null;
    }

    current = object;
  }

  return null;
}

export function dottedName(node: t.Node | null | undefined): string | null {
  if (!node) return null;
  if (t.isIdentifier(node)) return node.name;

  if (t.isMemberExpression(node)) {
    const object = dottedName(node.object);
    const property = dottedName(node.property);

    if (object && property) return `${object}.${property}`;
  }

  return null;
}

export function callName(node: t.CallExpression): string | null {
  const { callee } = node;

  if (t.isIdentifier(callee)) return callee.name;

  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name;
  }

  return null;
}

function schemaNamesInCall(node: t.CallExpression): string[] {
  const names: string[] = [];

  for (const arg of node.arguments) {
    if (t.isIdentifier(arg) && SCHEMA_LIKE.test(arg.name)) {
      names.push(arg.name);
    }

    if (t.isObjectExpression(arg)) {
      for (const prop of arg.properties) {
        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.value) &&
          SCHEMA_LIKE.test(prop.value.name)
        ) {
          names.push(prop.value.name);
        }
      }
    }
  }

  return names;
}

function locationOf(file: string, node: t.Node) {
  if (!node.loc) return { file };

  return { file, line: node.loc.start.line, column: node.loc.start.column };
}
