// Interactive REPL root — presentation + interaction only.
// One main prompt (`›`); arrow keys navigate the autocomplete suggestions,
// never the app itself. Completed commands append to the transcript and
// return to the prompt. Business logic lives in handlers.ts + Core.

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { ParsedInput, SlashCommand, parseSlashInput, resolveEnter, suggestCommands } from "../repl/commandRegistry.js";
import { browseDown, browseUp, emptyHistory, HistoryState, pushHistory, resetBrowsing } from "../repl/history.js";
import { handleParsed, runReport, runTest } from "../repl/dispatchCommands.js";
import { SpinnerLine } from "./Spinner.js";
import { OutputLine, TranscriptEntry, capTranscript } from "../repl/transcript.js";
import {
  ConfigDraft,
  ConfigStep,
  draftToCredentials,
  emptyDraft,
  fallbackFor,
  nextStep,
  validateStep,
} from "../repl/configForm.js";
import { configPromptLabel, maskValue, toConfigFlowLines } from "../views/configView.js";
import { loadCredentials, saveCredentials } from "../../config/app.js";
import { MergingSessionStore } from "../../config/sessions.js";
import { Home } from "./Home.js";

export interface ReplAppProps {
  rootDir: string;
  projectName: string;
  projectSlug: string;
  framework: string;
}

const MAX_SUGGESTIONS = 8;

export function ReplApp({ rootDir, projectName, projectSlug, framework }: ReplAppProps) {
  const { exit } = useApp();
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  // Append-only buffer: printable input lands at the end, Backspace removes
  // the last char. No mid-line cursor movement (keeps one input handler).
  const [value, setValue] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, setRunning] = useState(false);
  const [pending, setPending] = useState<{ id: number; label: string } | null>(null);
  const nextId = useRef(1);
  // Ref mirror — useInput callbacks capture stale state otherwise.
  const runningRef = useRef(false);
  // Shell-style history: every non-empty submit lands here (even mistyped
  // ones). Independent from the transcript — /clear never touches it.
  // Secrets can't land here: the /config flow never goes through submit().
  const historyRef = useRef<HistoryState>(emptyHistory());
  // REPL working session — in-memory only (`MergingSessionStore` without
  // rootDir): `/test` merges into it and `/report` publishes it. Quitting
  // the CLI discards it; no cache file is ever written or left behind.
  const sessionStore = useMemo(() => new MergingSessionStore(), []);

  // /config multi-turn flow: prompt state lives here (never inquirer —
  // inquirer would steal the same TTY Ink reads via useInput).
  interface ConfigFlow {
    draft: ConfigDraft;
    step: ConfigStep;
    id: number;
  }
  const [configFlow, setConfigFlow] = useState<ConfigFlow | null>(null);
  const configRef = useRef<ConfigFlow | null>(null);
  function setFlow(next: ConfigFlow | null) {
    configRef.current = next;
    setConfigFlow(next);
  }

  // Suggestions are suppressed while configuring (the buffer holds URLs and
  // secrets, never a "/token").
  const suggestions = configFlow ? [] : visibleSuggestions(value, dismissed);

  useInput((input, key) => {
    // Config flow owns every keystroke until it completes or is cancelled.
    if (configRef.current) {
      if (key.return) {
        advanceConfigFlow();
      } else if (key.escape) {
        cancelConfigFlow();
      } else if (key.backspace || key.delete) {
        setValue((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.tab && input) {
        setValue((prev) => prev + input);
      }
      return;
    }

    if (key.return) {
      const highlighted = suggestions[highlight % Math.max(suggestions.length, 1)] ?? null;
      const resolution = resolveEnter(value, highlighted);

      if (resolution.action === "complete") {
        setValue(resolution.input);
        setHighlight(0);
        setDismissed(false);
      } else {
        void submit(value);
      }

      return;
    }

    if (key.tab) {
      const highlighted = suggestions[highlight % Math.max(suggestions.length, 1)] ?? null;
      const resolution = resolveEnter(value, highlighted);

      if (resolution.action === "complete") {
        setValue(resolution.input);
        setHighlight(0);
        setDismissed(false);
      }

      return;
    }

    if (key.escape) {
      setDismissed(true);
      historyRef.current = resetBrowsing(historyRef.current);
      return;
    }

    if (key.upArrow) {
      if (suggestions.length > 0) {
        setHighlight((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else {
        // Overlay hidden → arrows browse history (even past /test lines).
        const nav = browseUp(historyRef.current);
        historyRef.current = nav.state;
        if (nav.line !== null) {
          setValue(nav.line);
          setHighlight(0);
          setDismissed(true);
        }
      }

      return;
    }

    if (key.downArrow) {
      if (suggestions.length > 0) {
        setHighlight((prev) => (prev + 1) % suggestions.length);
      } else {
        const nav = browseDown(historyRef.current);
        historyRef.current = nav.state;
        if (nav.present) {
          setValue("");
        } else if (nav.line !== null) {
          setValue(nav.line);
        }
        setHighlight(0);
        setDismissed(true);
      }

      return;
    }

    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      setHighlight(0);
      setDismissed(false);
      historyRef.current = resetBrowsing(historyRef.current);
      return;
    }

    if (key.ctrl || key.meta) {
      return;
    }

    if (input) {
      setValue((prev) => prev + input);
      setHighlight(0);
      setDismissed(false);
      historyRef.current = resetBrowsing(historyRef.current);
    }
  });

  function cancelConfigFlow() {
    const flow = configRef.current;
    if (!flow) return;
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === flow.id
          ? { ...entry, lines: [{ text: "Config cancelled — no changes saved.", tone: "yellow" as const }] }
          : entry,
      ),
    );
    setFlow(null);
    setValue("");
    setHighlight(0);
    setDismissed(false);
  }

  function advanceConfigFlow() {
    const flow = configRef.current;
    if (!flow) return;
    const { draft, step, id } = flow;
    const validation = validateStep(step, value, draft);
    if (!validation.ok) {
      setEntries((prev) =>
        capTranscript([
          ...prev,
          {
            id: nextId.current++,
            command: `? ${configPromptLabel(step)}`,
            lines: [{ text: validation.error, tone: "red" as const }],
          },
        ]),
      );
      return;
    }
    const updated: ConfigDraft = { ...draft, [step]: value };
    const following = nextStep(step);
    if (following === null) {
      // Step 6/6 valid — save only here, never mid-flow (user decision:
      // /config only writes the file, no network probe).
      saveCredentials(rootDir, draftToCredentials(updated));
      const done: OutputLine[] = [
        { text: "✔ Backend target config saved.", tone: "green" },
        { text: "Run /test when ready.", tone: "dim" },
      ];
      setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, lines: done } : entry)));
      setFlow(null);
      setValue("");
      setHighlight(0);
      setDismissed(false);
      return;
    }
    setFlow({ draft: updated, step: following, id });
    setValue(fallbackFor(following, updated));
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, lines: toConfigFlowLines(updated, following) } : entry)),
    );
  }

  function startConfigFlow() {
    const draft = emptyDraft(loadCredentials(rootDir));
    const first: ConfigStep = "baseUrl";
    const id = nextId.current++;
    setFlow({ draft, step: first, id });
    // Pre-fill the buffer with the fallback so Enter keeps the current value
    // (same semantics as inquirer's `default` in cli/prompt.ts).
    setValue(fallbackFor(first, draft));
    setHighlight(0);
    setDismissed(true);
    setEntries((prev) => capTranscript([...prev, { id, command: "/config", lines: toConfigFlowLines(draft, first) }]));
  }

  async function submit(raw: string) {
    const parsed: ParsedInput = parseSlashInput(raw);
    setValue("");
    setHighlight(0);
    setDismissed(false);

    if (parsed.kind === "empty") {
      return;
    }

    // Record every submit (even mistyped ones, shell-style). History lives
    // outside the transcript, so /clear and validation errors never touch it.
    historyRef.current = pushHistory(historyRef.current, raw);

    // /config opens the multi-turn flow (user decision: /clear mid-flow
    // cancels the flow AND clears the transcript; /quit always wins).
    if (parsed.kind === "command" && parsed.command.name === "config") {
      if (runningRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Already running — wait for it to finish.", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
      if (configRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Already configuring — finish or cancel first (Esc).", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
      startConfigFlow();
      return;
    }

    // /test is async (network) + guarded: one run at a time so the core
    // never double-sends to the user's backend. /quit and /clear always win.
    if (parsed.kind === "command" && parsed.command.name === "test") {
      if (runningRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Already running — wait for it to finish.", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
      const id = nextId.current++;
      const command = raw.trim();
      runningRef.current = true;
      setRunning(true);
      setPending({ id, label: "Testing…" });
      setEntries((prev) =>
        capTranscript([...prev, { id, command, lines: [{ text: "Testing…", tone: "dim" }] }]),
      );
      try {
        const lines = await runTest(rootDir, parsed.args, { store: sessionStore });
        setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, lines } : entry)));
      } finally {
        runningRef.current = false;
        setRunning(false);
        setPending((current) => (current?.id === id ? null : current));
      }
      return;
    }

    // /report is async (network) + guarded like /test: one run at a time.
    if (parsed.kind === "command" && parsed.command.name === "report") {
      if (runningRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Already running — wait for it to finish.", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
      const id = nextId.current++;
      const command = raw.trim();
      runningRef.current = true;
      setRunning(true);
      setPending({ id, label: "Publishing…" });
      setEntries((prev) =>
        capTranscript([...prev, { id, command, lines: [{ text: "Publishing…", tone: "dim" }] }]),
      );
      try {
        const lines = await runReport(rootDir, parsed.args, { store: sessionStore });
        setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, lines } : entry)));
      } finally {
        runningRef.current = false;
        setRunning(false);
        setPending((current) => (current?.id === id ? null : current));
      }
      return;
    }

    if (parsed.kind === "command" && parsed.command.name !== "quit" && parsed.command.name !== "clear") {
      if (runningRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Already running — wait for it to finish.", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
      if (configRef.current) {
        setEntries((prev) =>
          capTranscript([
            ...prev,
            {
              id: nextId.current++,
              command: raw.trim(),
              lines: [{ text: "Finish or cancel /config first (Esc).", tone: "yellow" }],
            },
          ]),
        );
        return;
      }
    }

    const result = handleParsed(rootDir, parsed);

    if (result.action === "quit") {
      exit();
      return;
    }

    if (result.action === "clear") {
      // Decided: /clear mid-flow cancels the flow AND clears the transcript.
      setFlow(null);
      setValue("");
      setEntries([]);
      return;
    }

    setEntries((prev) =>
      capTranscript([...prev, { id: nextId.current++, command: raw.trim(), lines: result.lines }]),
    );
  }

  return (
    <AppShell
      suggestions={suggestions}
      highlight={highlight}
      home={<Home projectName={projectName} projectSlug={projectSlug} framework={framework} />}
      transcript={entries.map((entry) => (
        <Box key={entry.id} flexDirection="column" marginTop={1} marginBottom={1}>
          <Text>
            <Text bold color="yellow">› </Text>
            <Text>{entry.command}</Text>
          </Text>
          {pending?.id === entry.id ? (
            <SpinnerLine label={pending.label} />
          ) : (
            entry.lines.map((line, index) => <TranscriptLine key={index} text={line.text} tone={line.tone} />)
          )}
        </Box>
      ))}
      value={value}
      configFlow={configFlow}
    />
  );
}

/**
 * Layout shell. Content flows naturally from the header down to the prompt.
 * The suggestion palette is absolutely positioned inside the prompt wrapper,
 * anchored one row above it, so it floats and overlays whatever content sits
 * behind it (drop-up) without taking part in layout.
 */
function AppShell({
  suggestions,
  highlight,
  home,
  transcript,
  value,
  configFlow,
}: {
  suggestions: SlashCommand[];
  highlight: number;
  home: ReactNode;
  transcript: ReactNode;
  value: string;
  configFlow: { step: ConfigStep; draft: ConfigDraft } | null;
}) {
  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      {home}
      <Box flexDirection="column" flexShrink={0}>
        {transcript}
      </Box>
      <Box flexDirection="column" width="100%">
        {configFlow ? (
          <ConfigPromptLine step={configFlow.step} value={value} />
        ) : (
          <>
            <PromptLine value={value} />
            {suggestions.length > 0 ? (
              <SuggestionOverlay suggestions={suggestions} highlight={highlight} />
            ) : null}
          </>
        )}
      </Box>
    </Box>
  );
}

function PromptLine({ value }: { value: string }) {
  return (
    <Box>
      <Text bold color="yellow">› </Text>
      <Text>{value}</Text>
      <Text inverse> </Text>
    </Box>
  );
}

function ConfigPromptLine({ step, value }: { step: ConfigStep; value: string }) {
  return (
    <Box>
      <Text bold color="yellow">› </Text>
      <Text>{maskValue(step, value)}</Text>
      <Text inverse> </Text>
    </Box>
  );
}

/**
 * Floating command palette: absolutely positioned so it overlays the content
 * above the prompt (drop-up, like most CLI tools) without shifting layout.
 * `bottom` is measured from the top of the prompt row (this box's parent), so
 * the palette grows upward as suggestions are added.
 */
function SuggestionOverlay({ suggestions, highlight }: { suggestions: SlashCommand[]; highlight: number }) {
  const shown = suggestions.slice(0, MAX_SUGGESTIONS);
  return (
    <Box
      position="absolute"
      bottom={1}
      left={0}
      right={0}
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      backgroundColor="black"
      paddingX={1}
    >
      {shown.map((suggestion, index) => (
        <Text key={suggestion.name} color={index === highlight ? "yellow" : undefined} bold={index === highlight} dimColor={index !== highlight}>
          {index === highlight ? "❯ " : "  "}/{suggestion.name} — {suggestion.description}
        </Text>
      ))}
      <Text dimColor>↑↓ select · Enter complete/run · Esc dismiss</Text>
    </Box>
  );
}

/** Suggestions only while the line is a bare "/token" (no args typed yet). */
function visibleSuggestions(value: string, dismissed: boolean): SlashCommand[] {
  if (dismissed || !/^\/[^\s]*$/.test(value)) {
    return [];
  }

  return suggestCommands(value.slice(1));
}

function TranscriptLine({ text, tone }: { text: string; tone: string }) {
  if (tone === "dim") return <Text dimColor>{text === "" ? " " : text}</Text>;
  if (tone === "green") return <Text color="green">{text}</Text>;
  if (tone === "red") return <Text color="red">{text}</Text>;
  if (tone === "yellow") return <Text color="yellow">{text}</Text>;
  if (tone === "cyan") return <Text color="cyan">{text}</Text>;
  return <Text>{text === "" ? " " : text}</Text>;
}
