// Transcript model — pure data for the REPL scrollback.
// Entries accumulate; the prompt never navigates away to another screen.

export type LineTone = "default" | "dim" | "green" | "red" | "yellow" | "cyan";

export interface OutputLine {
  text: string;
  tone: LineTone;
}

export interface TranscriptEntry {
  id: number;
  command: string;
  lines: OutputLine[];
}

/** Bound the scrollback so long sessions cannot grow memory unboundedly. */
export const MAX_TRANSCRIPT_ENTRIES = 200;

export function capTranscript(entries: TranscriptEntry[]): TranscriptEntry[] {
  if (entries.length <= MAX_TRANSCRIPT_ENTRIES) {
    return entries;
  }

  return entries.slice(entries.length - MAX_TRANSCRIPT_ENTRIES);
}
