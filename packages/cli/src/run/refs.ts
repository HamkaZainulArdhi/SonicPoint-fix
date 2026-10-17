// Body reference resolution (foreign keys). The AI cannot invent an id that
// already exists in the user's database, so ids are sampled from the user's
// own GET collections and cached in `.sonic-point.json` — flat, one slot per
// noun, tagged with the host it came from.
//
// Nothing here ever creates data: when no id can be sampled the payload is
// left untouched and the endpoint's own error (usually 404) is reported as-is.
// A cached id whose request came back "not found" is marked stale and
// resampled on the next run.

import { Endpoint } from "../domain/endpoint.js";
import { RefMap, SampledRef } from "../domain/ref.js";
import { SchemaDefinition } from "../domain/schema.js";
import { Fetch, joinUrl } from "./http.js";
import {
  collectionCandidates,
  firstResource,
  idKeysFor,
  idOf,
  referenceNoun,
} from "./resources.js";

export interface RefField {
  field: string;
  noun: string;
}

export interface ResolvedRef {
  value: string | null;
  /** True when the value came from the `.sonic-point.json` cache. */
  fromCache: boolean;
}

export interface RefResolverOptions {
  refs: RefMap;
  host: string;
  endpoints: Endpoint[];
  baseUrl: string;
  token: string;
  fetchImpl: Fetch;
  onSampled?(ref: SampledRef): void;
}

/** Cache key for one backend (`http://localhost:3000`). */
export function normalizeHost(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "").toLowerCase();
}

/** Body fields of a validation schema that carry a foreign key. */
export function refFields(schema: SchemaDefinition): RefField[] {
  const fields: RefField[] = [];

  for (const prop of schema.properties) {
    const noun = referenceNoun(prop.name);
    if (noun) fields.push({ field: prop.name, noun });
  }

  return fields;
}

/** One-line notice for the capture/refresh sinks (CLI print, TUI transcript). */
export function refNotice(ref: SampledRef): string {
  return ref.previous
    ? `↳ refs.${ref.noun} was stale — refreshed to ${ref.id}`
    : `↳ refs.${ref.noun} = ${ref.id} (saved)`;
}

export class RefResolver {
  private readonly entries: RefMap;
  private readonly host: string;
  private readonly endpoints: Endpoint[];
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: Fetch;
  private readonly onSampled?: (ref: SampledRef) => void;
  private readonly memo = new Map<string, Promise<ResolvedRef>>();
  private changed = false;

  constructor(options: RefResolverOptions) {
    this.entries = { ...options.refs };
    this.host = options.host;
    this.endpoints = options.endpoints;
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.fetchImpl = options.fetchImpl;
    this.onSampled = options.onSampled;
  }

  /** Resolve one noun. Sampled at most once per run, then memoized. */
  resolve(noun: string): Promise<ResolvedRef> {
    const pending = this.memo.get(noun);
    if (pending) return pending;

    const started = this.resolveOnce(noun);
    this.memo.set(noun, started);
    return started;
  }

  /** A request that used a cached id came back "not found" → resample next run. */
  markStale(noun: string): void {
    const entry = this.entries[noun];
    if (!entry || entry.stale) return;

    entry.stale = true;
    this.changed = true;
  }

  /** True when the cache needs to be written back to `.sonic-point.json`. */
  get dirty(): boolean {
    return this.changed;
  }

  snapshot(): RefMap {
    return this.entries;
  }

  private async resolveOnce(noun: string): Promise<ResolvedRef> {
    const entry = this.entries[noun];

    if (entry && entry.host === this.host && !entry.stale) {
      return { value: entry.id, fromCache: true };
    }

    for (const collection of collectionCandidates(noun, this.endpoints)) {
      const sampled = await this.sample(collection, noun);
      if (!sampled) continue;

      const previous = entry && entry.host === this.host ? entry.id : undefined;
      this.entries[noun] = {
        id: sampled,
        source: `GET ${collection}`,
        host: this.host,
        capturedAt: new Date().toISOString(),
      };
      this.changed = true;
      this.onSampled?.(previous ? { noun, id: sampled, previous } : { noun, id: sampled });

      return { value: sampled, fromCache: false };
    }

    // Sampling came up empty: a cached id from this same host still beats an
    // invented one, so keep it — the endpoint's own 404 stays the honest result.
    if (entry && entry.host === this.host) return { value: entry.id, fromCache: true };

    return { value: null, fromCache: false };
  }

  private async sample(collection: string, noun: string): Promise<string | null> {
    try {
      const response = await this.fetchImpl(joinUrl(this.baseUrl, collection), {
        method: "GET",
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) return null;

      const resource = firstResource(await response.json());
      return resource ? idOf(resource, idKeysFor(noun)) : null;
    } catch {
      return null;
    }
  }
}
