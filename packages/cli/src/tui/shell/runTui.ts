// TUI entry — the only place that calls Ink's render().
// Gathers read-only project info via existing core and hands it to
// <ReplApp/> as props. No scan runs at startup; scanning is on-demand
// via /scan so the prompt appears immediately.

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "ink";
import { ReplApp } from "./ReplApp.js";
import { resolveProject } from "../../config/app.js";

function detectFramework(rootDir: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    if (pkg.dependencies?.["express"] ?? pkg.devDependencies?.["express"]) {
      return "Express";
    }
  } catch {
    // Fall through to Unknown — never throw from informational detection.
  }

  return "Unknown";
}

export async function runTui(rootDir: string): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "Interactive mode needs a TTY. Run inside Windows Terminal / PowerShell 7 / a Unix terminal, " +
        "or use command mode (e.g. `sonic-point scan --help`).",
    );
    process.exitCode = 1;
    return;
  }

  const project = resolveProject(rootDir);

  const { waitUntilExit } = render(
    React.createElement(ReplApp, {
      rootDir,
      projectName: project.name,
      projectSlug: project.slug,
      framework: detectFramework(rootDir),
    }),
  );

  await waitUntilExit();
}
