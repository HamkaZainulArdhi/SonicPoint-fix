// Strict parser for /test — pure, no fs/network/Ink.
// Contract: method is always required (unlike `send` which silently
// ignores a bare path). Bulk (method-only) is only allowed for GET
// (safe/idempotent); every write method must carry an explicit path.

export const SAFE_BULK_METHODS = ["GET"] as const;
export const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
export const VALID_METHODS = [...SAFE_BULK_METHODS, ...WRITE_METHODS] as const;

export type ValidMethod = (typeof VALID_METHODS)[number];

export type TestFilter =
  | { kind: "bulk"; method: "GET" }
  | { kind: "single"; method: ValidMethod; path: string };

export type TestArgsOk = { ok: true; filter: TestFilter; concreteParams: Map<string, string> | null };
export type TestArgsError = { ok: false; error: string; hint: string };

const USAGE = "Usage: /test <METHOD> [PATH]";
const EXAMPLES = "Examples: /test GET  ·  /test POST /api/items  ·  /test GET /api/items/:itemId";
const METHODS_HINT = `Available methods: ${VALID_METHODS.join(" ")}`;

function hintForSingle(method: ValidMethod): string {
  return `Example: /test ${method} /api/items`;
}

export function parseTestArgs(args: string[]): TestArgsOk | TestArgsError {
  if (args.length === 0) {
    return {
      ok: false,
      error: `${USAGE} — method is required.`,
      hint: EXAMPLES,
    };
  }

  if (args.length > 2) {
    return {
      ok: false,
      error: `${USAGE} — too many arguments.`,
      hint: EXAMPLES,
    };
  }

  const rawMethod = args[0]?.trim() ?? "";
  const methodUpper = rawMethod.toUpperCase();
  if (!isValidMethod(methodUpper)) {
    return {
      ok: false,
      error: `Unknown method: ${rawMethod || "(empty)"}.`,
      hint: METHODS_HINT,
    };
  }

  const method = methodUpper as ValidMethod;

  if (args.length === 1) {
    if (!isSafeBulk(method)) {
      return {
        ok: false,
        error: `Write methods require a path.`,
        hint: hintForSingle(method),
      };
    }
    return { ok: true, filter: { kind: "bulk", method: "GET" }, concreteParams: null };
  }

  const rawPath = args[1]?.trim() ?? "";
  if (!rawPath) {
    return {
      ok: false,
      error: `Path is required with ${method} when a second argument is given.`,
      hint: hintForSingle(method),
    };
  }
  if (!rawPath.startsWith("/")) {
    return {
      ok: false,
      error: `Path must start with "/". Got: ${rawPath}`,
      hint: hintForSingle(method),
    };
  }

  const path = normalizePath(rawPath);
  const concreteParams = extractConcreteParams(path);
  return { ok: true, filter: { kind: "single", method, path }, concreteParams };
}

export function normalizePath(value: string): string {
  if (value === "/") return value;
  return value.replace(/\/+$/, "") || "/";
}

function isValidMethod(value: string): boolean {
  return (VALID_METHODS as readonly string[]).includes(value);
}

function isSafeBulk(method: string): boolean {
  return (SAFE_BULK_METHODS as readonly string[]).includes(method);
}

/**
 * If the user typed a concrete path like /api/items/item-42 that conceptually
 * corresponds to a template /api/items/:itemId, the concrete segment values
 * can be used as param defaults. For a raw concrete path we don't yet know
 * which segment is a param, so we only handle the case where the path itself
 * still contains :param tokens — those are not concrete; concrete segments
 * are extracted positionally when the template is later matched.
 * For now: if the path contains no colon, treat it as already concrete and
 * return no param map; template-aware extraction happens in dispatch where
 * the matched template is known. This helper just captures explicit :param
 * values if the user typed them literally (rare, but keep the pipe).
 */
function extractConcreteParams(path: string): Map<string, string> | null {
  // No colon → no explicit :param assignment to capture here.
  if (!path.includes(":")) return null;
  // Path like /api/items/:itemId with a concrete value not given — nothing to capture.
  // We only synthesize a map when the user writes a concrete value at a :param position
  // and we can see the template. That resolution is done in dispatch (needs the endpoint
  // template). So return null here; dispatch will build the real map.
  return null;
}

/** Build a param map from a concrete path + its matched template. */
export function concreteParamsForTemplate(template: string, concretePath: string): Map<string, string> | null {
  const tSegs = template.split("/").filter(Boolean);
  const cSegs = concretePath.split("/").filter(Boolean);
  if (tSegs.length !== cSegs.length) return null;
  const map = new Map<string, string>();
  for (let i = 0; i < tSegs.length; i++) {
    const t = tSegs[i];
    const c = cSegs[i];
    if (t.startsWith(":")) {
      const name = t.slice(1);
      if (!c) return null;
      map.set(name, decodeURIComponent(c));
    } else if (t !== c) {
      return null;
    }
  }
  return map.size > 0 ? map : null;
}
