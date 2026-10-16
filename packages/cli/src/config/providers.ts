import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ProviderCredentials {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

/** A resolved credential plus where it came from and migration warnings. */
export interface Resolved<T> {
  value: T | null;
  source: "env" | "file" | "legacy" | "missing";
  warnings: string[];
}

const LEGACY_KEYS = [
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
];

export function resolveGeminiKey(): Resolved<string> {
  const warnings = legacyWarnings(process.cwd());

  const fromEnv = process.env.SONIC_POINT_GEMINI_API_KEY?.trim();
  if (fromEnv) return { value: fromEnv, source: "env", warnings };

  const fromFile = loadFile()?.geminiApiKey?.trim();
  if (fromFile) return { value: fromFile, source: "file", warnings };

  const legacy = process.env.GEMINI_API_KEY?.trim();
  if (legacy) {
    warnings.push("GEMINI_API_KEY is legacy. Move it to SONIC_POINT_GEMINI_API_KEY or run `sonic-point init`.");
    return { value: legacy, source: "legacy", warnings };
  }

  return { value: null, source: "missing", warnings };
}

export function resolveSupabase(): Resolved<{ url: string; key: string }> {
  const warnings = legacyWarnings(process.cwd());

  const envUrl = process.env.SONIC_POINT_SUPABASE_URL?.trim();
  const envKey = process.env.SONIC_POINT_SUPABASE_KEY?.trim();
  if (envUrl && envKey) return { value: { url: envUrl, key: envKey }, source: "env", warnings };

  const file = loadFile();
  if (file?.supabaseUrl?.trim() && file?.supabaseKey?.trim()) {
    return {
      value: { url: file.supabaseUrl.trim(), key: file.supabaseKey.trim() },
      source: "file",
      warnings,
    };
  }

  const legacyUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const legacyKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (legacyUrl && legacyKey) {
    warnings.push("Supabase legacy env vars detected. Move them to SONIC_POINT_SUPABASE_URL / SONIC_POINT_SUPABASE_KEY.");
    return { value: { url: legacyUrl, key: legacyKey }, source: "legacy", warnings };
  }

  return { value: null, source: "missing", warnings };
}

function homeDir(): string {
  return process.env.SONIC_POINT_HOME?.trim() || path.join(os.homedir(), ".sonic-point");
}

function configFile(): string {
  return path.join(homeDir(), "providers.json");
}

function loadFile(): ProviderCredentials | null {
  try {
    return JSON.parse(fs.readFileSync(configFile(), "utf-8")) as ProviderCredentials;
  } catch {
    return null;
  }
}

export function saveProviders(credentials: ProviderCredentials): void {
  const file = configFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(credentials, null, 2), "utf-8");
}

function legacyWarnings(rootDir: string): string[] {
  let content: string;

  try {
    content = fs.readFileSync(path.join(rootDir, ".env"), "utf-8");
  } catch {
    return [];
  }

  const found = LEGACY_KEYS.filter((key) =>
    new RegExp(`(^|\\n)\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`).test(content),
  );

  if (found.length === 0) return [];

  return [
    `Legacy provider env vars in .env: ${found.join(", ")}. Move them to SONIC_POINT_* env or run \`sonic-point init\`.`,
  ];
}
