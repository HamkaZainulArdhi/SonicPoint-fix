import { Endpoint, RouteFile, endpointId } from "../../domain/endpoint.js";
import { findCodeFiles } from "../core/findFiles.js";
import { parseFile } from "../core/parseAst.js";
import { collectRouteFile } from "./collectRoutes.js";
import { RouteTree, buildRouteTree, resolveImportFile } from "./resolveTree.js";

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanError";
  }
}

/**
 * Discover all active endpoints: parse every code file, then resolve the
 * route tree from each entry file (files containing mounts). Only mounted
 * routes are returned; duplicates are removed.
 */
export function scanEndpoints(rootDir: string): Endpoint[] {
  const files = findCodeFiles(rootDir);
  const tree: RouteTree = { files: new Map<string, RouteFile>() };

  for (const file of files) {
    const ast = parseFile(file);

    tree.files.set(
      file,
      ast
        ? collectRouteFile(file, ast)
        : { file, imports: {}, mounts: [], endpoints: [] },
    );
  }

  const mounted = new Set<string>();

  for (const routeFile of tree.files.values()) {
    for (const mount of routeFile.mounts) {
      const specifier = routeFile.imports[mount.variableName];
      if (!specifier) continue;

      const resolved = resolveImportFile(routeFile.file, specifier);
      if (resolved) mounted.add(resolved);
    }
  }

  const withMounts = [...tree.files.values()].filter((f) => f.mounts.length > 0);

  // Roots are mount files nobody mounts. Pure cycles (no root) fall back
  // to all mount files; the tree walker's visited set still terminates.
  const roots = withMounts.filter((f) => !mounted.has(f.file));
  const entries = roots.length > 0 ? roots : withMounts;

  if (entries.length === 0) {
    throw new ScanError("No entry file found (no app.use / router.use mounts detected).");
  }

  const seen = new Set<string>();
  const endpoints: Endpoint[] = [];

  for (const entry of entries) {
    for (const endpoint of buildRouteTree(tree, entry.file)) {
      const id = endpointId(endpoint);

      if (seen.has(id)) continue;
      seen.add(id);
      endpoints.push(endpoint);
    }
  }

  if (endpoints.length === 0) {
    throw new ScanError("No endpoints found in the mounted route tree.");
  }

  return endpoints;
}
