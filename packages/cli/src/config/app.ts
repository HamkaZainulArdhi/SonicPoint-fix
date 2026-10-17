import fs from "node:fs";
import path from "node:path";
import { RefMap } from "../domain/ref.js";

export interface AppCredentials {
  baseUrl: string;
  loginEndpoint: string;
  email: string;
  password: string;
  tokenField: string;
  token?: string;
  /** Captured foreign keys, flat per noun (see domain/ref.ts). */
  refs?: RefMap;
}

const CONFIG_FILE = ".sonic-point.json";

export function configPath(rootDir: string): string {
  return path.join(rootDir, CONFIG_FILE);
}

export function loadCredentials(rootDir: string): AppCredentials | null {
  try {
    return JSON.parse(fs.readFileSync(configPath(rootDir), "utf-8")) as AppCredentials;
  } catch {
    return null;
  }
}

export function saveCredentials(rootDir: string, credentials: AppCredentials): void {
  fs.writeFileSync(configPath(rootDir), JSON.stringify(credentials, null, 2), "utf-8");
}

/**
 * Persist captured reference ids. Read-modify-write so credentials/token
 * written by the same run are never clobbered; never invents the file.
 */
export function saveRefs(rootDir: string, refs: RefMap): void {
  const current = loadCredentials(rootDir);
  if (!current) return;

  fs.writeFileSync(configPath(rootDir), JSON.stringify({ ...current, refs }, null, 2), "utf-8");
}

/** Human-readable project identity: env override → package.json → folder name. */
export function resolveProject(rootDir: string): { slug: string; name: string } {
  const override = process.env.SONIC_POINT_PROJECT_ID?.trim();

  if (override) {
    return { slug: slugify(override), name: override };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")) as {
      name?: string;
    };

    if (pkg.name) {
      return { slug: slugify(pkg.name), name: pkg.name };
    }
  } catch {
    // Fall through to folder name.
  }

  const folder = path.basename(rootDir);
  return { slug: slugify(folder), name: folder };
}

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}
