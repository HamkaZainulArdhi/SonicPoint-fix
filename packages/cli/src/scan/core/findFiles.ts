import fs from "node:fs";
import path from "node:path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
]);

/** All .js/.ts files under rootDir, sorted for deterministic output. */
export function findCodeFiles(rootDir: string): string[] {
  const found: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && (full.endsWith(".js") || full.endsWith(".ts"))) {
        found.push(full);
      }
    }
  }

  return found.sort();
}
