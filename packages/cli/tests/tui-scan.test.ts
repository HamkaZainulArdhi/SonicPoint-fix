import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupEndpointsByFile } from "../src/tui/views/scanView.js";
import { Endpoint } from "../src/domain/endpoint.js";

function endpoint(method: string, path: string, sourceFile: string): Endpoint {
  return { method, path, sourceFile, middlewares: [], validationSchemas: [] };
}

describe("groupEndpointsByFile", () => {
  it("groups by source file preserving first-seen order", () => {
    const groups = groupEndpointsByFile([
      endpoint("GET", "/a", "f1"),
      endpoint("POST", "/b", "f2"),
      endpoint("GET", "/c", "f1"),
    ]);

    assert.deepEqual(
      groups.map((group) => group.sourceFile),
      ["f1", "f2"],
    );
    assert.deepEqual(
      groups[0].endpoints.map((e) => e.path),
      ["/a", "/c"],
    );
    assert.deepEqual(
      groups[1].endpoints.map((e) => e.path),
      ["/b"],
    );
  });

  it("returns an empty list when there are no endpoints", () => {
    assert.deepEqual(groupEndpointsByFile([]), []);
  });
});
