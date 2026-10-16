import fs from "node:fs";
import { parse } from "@babel/parser";
import type * as t from "@babel/types";

const PARSE_PLUGINS = ["typescript", "jsx"] as const;

/** Parse a file once. Returns null when the file is unreadable or unparsable. */
export function parseFile(file: string): t.File | null {
  let code: string;

  try {
    code = fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }

  try {
    return parse(code, {
      sourceType: "unambiguous",
      plugins: [...PARSE_PLUGINS],
      allowImportExportEverywhere: true,
    });
  } catch {
    return null;
  }
}
