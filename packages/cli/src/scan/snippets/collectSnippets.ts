import fs from "node:fs";
import path from "node:path";
import { scanEndpoints } from "../routes/scanEndpoints.js";
import { indexProject } from "../knowledge/indexSymbols.js";

export interface Snippet {
  id: string;
  file: string;
  relativeFile: string;
  language: "typescript" | "javascript" | "json" | "text";
  symbol: string;
  startLine: number;
  endLine: number;
  code: string;
  reason: string;
  confidence: number;
}

/** Line-window code excerpts around each endpoint and each definition. */
export function collectSnippets(rootDir: string): Snippet[] {
  const endpoints = scanEndpoints(rootDir);
  const index = indexProject(rootDir);
  const snippets: Snippet[] = [];
  const seen = new Set<string>();

  const push = (snippet: Snippet): void => {
    if (seen.has(snippet.id)) return;
    seen.add(snippet.id);
    snippets.push(snippet);
  };

  for (const endpoint of endpoints) {
    if (!endpoint.sourceLocation?.line) continue;

    push(endpointSnippet(rootDir, endpoint.sourceFile, endpoint.sourceLocation.line, {
      symbol:
        endpoint.validationSchemas[0] ??
        endpoint.middlewares[0] ??
        endpoint.controller ??
        "endpoint",
      reason: endpoint.validationSchemas.length > 0 ? "explicit-validation-middleware" : "route-handler-reference",
      confidence: endpoint.validationSchemas.length > 0 ? 100 : 75,
      context: 4,
    }));
  }

  for (const symbols of index.values()) {
    for (const definition of symbols.definitions) {
      if (!definition.location?.line) continue;

      push(endpointSnippet(rootDir, symbols.file, definition.location.line, {
        symbol: definition.name,
        reason: "symbol-definition",
        confidence: 60,
        context: 3,
      }));
    }
  }

  return snippets;
}

function endpointSnippet(
  rootDir: string,
  file: string,
  line: number,
  options: { symbol: string; reason: string; confidence: number; context: number },
): Snippet {
  const absolute = path.resolve(file);
  const lines = fs.readFileSync(absolute, "utf-8").split(/\r?\n/);
  const startLine = Math.max(1, line - options.context);
  const endLine = Math.min(lines.length, line + options.context);

  return {
    id: `snippet:${Buffer.from(`${absolute}:${options.symbol}:${startLine}:${endLine}`).toString("base64url")}`,
    file: absolute,
    relativeFile: path.relative(rootDir, absolute).replace(/\\/g, "/"),
    language: languageOf(absolute),
    symbol: options.symbol,
    startLine,
    endLine,
    code: lines.slice(startLine - 1, endLine).join("\n"),
    reason: options.reason,
    confidence: options.confidence,
  };
}

function languageOf(file: string): Snippet["language"] {
  const ext = path.extname(file).toLowerCase();

  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if (ext === ".js" || ext === ".jsx") return "javascript";
  if (ext === ".json") return "json";
  return "text";
}
