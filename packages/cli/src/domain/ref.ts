// Core domain: captured reference values (foreign keys) for request bodies.
// A "ref" is an id that must point at a row that already exists — the AI
// cannot invent it, so it is sampled from the user's own API and cached.

export interface RefEntry {
  id: string;
  /** Where the id came from, e.g. `GET /api/items`. */
  source: string;
  /** Normalized baseUrl the id was sampled from (one slot per noun). */
  host: string;
  capturedAt: string;
  /** Set when a request using this id came back "not found"; resampled next run. */
  stale?: boolean;
}

/** noun → entry. Flat: one slot per entity (`item`, `plant-analysis`, ...). */
export type RefMap = Record<string, RefEntry>;

/** Payload for the "captured/refreshed" notice sinks (CLI print, TUI transcript). */
export interface SampledRef {
  noun: string;
  id: string;
  /** Previous id when an existing entry was replaced (refresh). */
  previous?: string;
}
