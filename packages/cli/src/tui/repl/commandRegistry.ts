// Slash-command registry + input parser — pure, no Ink/React imports.
// High-level actions only; every entry maps 1:1 to SonicPoint Core.

export type CommandStatus = "ready" | "soon";

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  status: CommandStatus;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "scan", description: "Scan backend project dan menemukan route/API.", usage: "/scan", status: "ready" },
  { name: "schema", description: "Extract validation schemas.", usage: "/schema [METHOD] [PATH]", status: "ready" },
  { name: "context", description: "Peta endpoint ke controller, service, dan model.", usage: "/context [METHOD] [PATH]", status: "ready" },
  {
    name: "test",
    description: "Menjalankan testing/request flow terhadap endpoint (method wajib).",
    usage: "/test <METHOD> [PATH]",
    status: "ready",
  },
  { name: "report", description: "Publish cached test results and print the session report link.", usage: "/report [METHOD] [PATH]", status: "ready" },
  { name: "config", description: "Konfigurasi SonicPoint.", usage: "/config", status: "ready" },
  { name: "clear", description: "Membersihkan terminal.", usage: "/clear", status: "ready" },
  { name: "quit", description: "Keluar dari SonicPoint.", usage: "/quit", status: "ready" },
];

export type ParsedInput =
  | { kind: "empty" }
  | { kind: "not-slash" }
  | { kind: "unknown"; name: string }
  | { kind: "command"; command: SlashCommand; args: string[]; rawArgs: string };

/** Parse one REPL line. Manual typing always allowed — no selection forced. */
export function parseSlashInput(input: string): ParsedInput {
  const trimmed = input.trim();

  if (trimmed === "") {
    return { kind: "empty" };
  }

  if (!trimmed.startsWith("/")) {
    return { kind: "not-slash" };
  }

  const withoutSlash = trimmed.slice(1);
  const spaceIndex = withoutSlash.search(/\s/);
  const name = (spaceIndex === -1 ? withoutSlash : withoutSlash.slice(0, spaceIndex)).toLowerCase();
  const rawArgs = spaceIndex === -1 ? "" : withoutSlash.slice(spaceIndex + 1).trim();

  const command = SLASH_COMMANDS.find((entry) => entry.name === name);

  if (!command) {
    return { kind: "unknown", name };
  }

  return { kind: "command", command, args: rawArgs === "" ? [] : rawArgs.split(/\s+/), rawArgs };
}

/** Registry entries whose name starts with the typed token (case-insensitive). */
export function suggestCommands(token: string): SlashCommand[] {
  const lower = token.toLowerCase();
  return SLASH_COMMANDS.filter((entry) => entry.name.startsWith(lower));
}

export type EnterResolution = { action: "complete"; input: string } | { action: "execute" };

/**
 * Enter-accept contract: Enter completes the highlighted suggestion when the
 * typed token is still a strict prefix, and executes once the token matches.
 * Tab follows the same rule (complete only, never execute).
 */
export function resolveEnter(input: string, highlighted: SlashCommand | null): EnterResolution {
  if (!input.startsWith("/") || !highlighted) {
    return { action: "execute" };
  }

  const afterSlash = input.slice(1);
  const spaceIndex = afterSlash.search(/\s/);
  const token = spaceIndex === -1 ? afterSlash : afterSlash.slice(0, spaceIndex);
  const rest = spaceIndex === -1 ? "" : afterSlash.slice(spaceIndex);

  if (token.toLowerCase() === highlighted.name) {
    return { action: "execute" };
  }

  return { action: "complete", input: `/${highlighted.name}${rest === "" ? " " : rest}` };
}
