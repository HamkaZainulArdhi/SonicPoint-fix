// Shared test infra: every scanner suite builds the same thing — a miniature
// Express project in a temp dir. Only the mechanism lives here (create dir,
// write files, clean up); fixture contents stay in each suite so tests remain
// explicit about what they exercise.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const created: string[] = [];

/** Empty temp dir (fixtures that only need a rootDir, e.g. config/session files). */
export function tmpDir(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sp-${prefix}-`));
  created.push(root);
  return root;
}

/** Write a mini project (`files` = relative path → content) into a temp dir. */
export function tmpProject(prefix: string, files: Record<string, string>): string {
  const root = tmpDir(prefix);

  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content.trimStart(), "utf-8");
  }

  return root;
}

// Fixtures are disposable. Set SONIC_POINT_KEEP_FIXTURES=1 to keep them for debugging.
process.on("exit", () => {
  if (process.env.SONIC_POINT_KEEP_FIXTURES) return;

  for (const root of created) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // Best effort — a locked file must never fail the suite.
    }
  }
});
