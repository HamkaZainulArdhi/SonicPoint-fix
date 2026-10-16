import fs from "node:fs";
import path from "node:path";
import { Endpoint, RouteFile } from "../../domain/endpoint.js";

const EXTENSIONS = [".js", ".ts"];

/** Resolve an import specifier to an existing file, or null. */
export function resolveImportFile(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

export interface RouteTree {
  files: Map<string, RouteFile>;
}

/**
 * Walk mounts from entry files, composing prefixes. Files already visited
 * are skipped, so circular router imports terminate instead of recursing
 * forever.
 */
export function buildRouteTree(tree: RouteTree, entryFile: string): Endpoint[] {
  const results: Endpoint[] = [];
  const visited = new Set<string>();

  const walk = (file: string, prefix: string): void => {
    if (visited.has(file)) return;
    visited.add(file);

    const routeFile = tree.files.get(file);
    if (!routeFile) return;

    for (const endpoint of routeFile.endpoints) {
      results.push({ ...endpoint, path: prefix + endpoint.path });
    }

    for (const mount of routeFile.mounts) {
      const specifier = routeFile.imports[mount.variableName];
      if (!specifier) continue;

      const resolved = resolveImportFile(file, specifier);
      if (!resolved) continue;

      walk(resolved, prefix + mount.prefix);
    }
  };

  walk(entryFile, "");
  return results;
}
