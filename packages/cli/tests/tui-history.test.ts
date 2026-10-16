import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  browseDown,
  browseUp,
  emptyHistory,
  MAX_HISTORY_ENTRIES,
  pushHistory,
  resetBrowsing,
} from "../src/tui/repl/history.js";

describe("history push", () => {
  it("records every non-empty submit, even mistyped ones", () => {
    let state = emptyHistory();
    state = pushHistory(state, "/test GET /api/x");
    state = pushHistory(state, "/nope");
    assert.deepEqual(state.items, ["/test GET /api/x", "/nope"]);
    assert.equal(state.cursor, 2);
  });

  it("ignores blank lines", () => {
    let state = pushHistory(emptyHistory(), "/scan");
    state = pushHistory(state, "   ");
    assert.deepEqual(state.items, ["/scan"]);
  });

  it("caps at MAX_HISTORY_ENTRIES, keeping the newest", () => {
    let state = emptyHistory();
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      state = pushHistory(state, `/cmd-${i}`);
    }
    assert.equal(state.items.length, MAX_HISTORY_ENTRIES);
    assert.equal(state.items[0], "/cmd-5");
    assert.equal(state.items[MAX_HISTORY_ENTRIES - 1], `/cmd-${MAX_HISTORY_ENTRIES + 4}`);
  });
});

describe("history browsing", () => {
  it("walks back with up and forward with down, landing on present", () => {
    let state = emptyHistory();
    state = pushHistory(pushHistory(pushHistory(state, "/scan"), "/test GET"), "/config");
    let nav = browseUp(state);
    state = nav.state;
    assert.equal(nav.line, "/config");
    nav = browseUp(state);
    state = nav.state;
    assert.equal(nav.line, "/test GET");
    nav = browseUp(state);
    state = nav.state;
    assert.equal(nav.line, "/scan");
    // Clamped at the oldest entry.
    nav = browseUp(state);
    assert.equal(nav.line, null);

    const down = browseDown(state);
    state = down.state;
    assert.equal(down.line, "/test GET");
    assert.equal(down.present, false);
    const down2 = browseDown(browseDown(state).state);
    assert.equal(down2.present, true);
    assert.equal(down2.line, null);
  });

  it("does nothing on empty history", () => {
    const state = emptyHistory();
    assert.equal(browseUp(state).line, null);
    assert.equal(browseDown(state).present, true);
  });

  it("resets to present on typing or Esc", () => {
    let state = pushHistory(pushHistory(emptyHistory(), "/a"), "/b");
    state = browseUp(state).state;
    assert.equal(state.cursor, 1);
    state = resetBrowsing(state);
    assert.equal(state.cursor, 2);
    const nav = browseUp(state);
    assert.equal(nav.line, "/b");
  });
});
