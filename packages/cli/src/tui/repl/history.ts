// Shell-style command history — pure, no Ink/fs.
// Up/down browse previous submits when the autocomplete overlay is hidden
// (the overlay owns the arrows only while it is visible). History is
// session-only and independent from the transcript: /clear wipes the
// transcript but never the history. Secrets can never land here — the
// /config flow never goes through submit().

export const MAX_HISTORY_ENTRIES = 100;

export interface HistoryState {
  items: string[];
  /** Index into items; items.length means "present" (the live buffer). */
  cursor: number;
}

export function emptyHistory(): HistoryState {
  return { items: [], cursor: 0 };
}

/** Record one submit. Every non-empty line counts (even mistyped ones). */
export function pushHistory(state: HistoryState, command: string): HistoryState {
  const trimmed = command.trim();
  if (!trimmed) return state;
  const items = [...state.items, trimmed].slice(-MAX_HISTORY_ENTRIES);
  return { items, cursor: items.length };
}

/** Move one step back. At the oldest entry, stay (shells beep; we clamp). */
export function browseUp(state: HistoryState): { state: HistoryState; line: string | null } {
  if (state.items.length === 0 || state.cursor <= 0) return { state, line: null };
  const cursor = state.cursor - 1;
  return { state: { ...state, cursor }, line: state.items[cursor] };
}

/** Move one step forward. Past the newest entry, return to the live buffer. */
export function browseDown(state: HistoryState): { state: HistoryState; line: string | null; present: boolean } {
  if (state.cursor >= state.items.length) return { state, line: null, present: true };
  const cursor = state.cursor + 1;
  if (cursor >= state.items.length) {
    return { state: { ...state, cursor }, line: null, present: true };
  }
  return { state: { ...state, cursor }, line: state.items[cursor], present: false };
}

/** Typing or Esc abandons browsing and returns to the live buffer. */
export function resetBrowsing(state: HistoryState): HistoryState {
  return { ...state, cursor: state.items.length };
}
