import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_PLATFORM_URL, resolvePlatformUrl } from "../src/config/platform.js";
import { RemoteAiClient } from "../src/ai/remote.js";
import { publishViaPlatform } from "../src/report/remote.js";
import { sampleSession } from "./helpers/fixtures.js";

describe("platform BE address", () => {
  it("defaults to sonicpoint.vercel.app", () => {
    assert.equal(DEFAULT_PLATFORM_URL, "https://sonicpoint.vercel.app");
    delete process.env.SONIC_POINT_PLATFORM_URL;
    assert.equal(resolvePlatformUrl(), "https://sonicpoint.vercel.app");
  });

  it("honors SONIC_POINT_PLATFORM_URL override", () => {
    process.env.SONIC_POINT_PLATFORM_URL = "http://localhost:3000/";
    assert.equal(resolvePlatformUrl(), "http://localhost:3000");
    delete process.env.SONIC_POINT_PLATFORM_URL;
  });
});

describe("RemoteAiClient", () => {
  it("returns the payload object on success", async () => {
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({ payload: { a: 1 } }),
    })) as unknown as typeof fetch;
    const client = new RemoteAiClient("https://sonicpoint.vercel.app", fakeFetch);
    assert.deepEqual(await client.generate("prompt"), { a: 1 });
  });

  it("returns null on provider failure or network error", async () => {
    const nullFetch = (async () => ({
      ok: true,
      json: async () => ({ payload: null }),
    })) as unknown as typeof fetch;
    assert.equal(await new RemoteAiClient("https://x", nullFetch).generate("p"), null);

    const badFetch = (async () => ({ ok: false })) as unknown as typeof fetch;
    assert.equal(await new RemoteAiClient("https://x", badFetch).generate("p"), null);

    const throwFetch = (async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    assert.equal(await new RemoteAiClient("https://x", throwFetch).generate("p"), null);
  });
});

describe("publishViaPlatform", () => {
  it("passes through published / skipped outcomes", async () => {
    const okFetch = (async () => ({
      ok: true,
      json: async () => ({
        status: "published",
        receipt: { sessionId: "s1", published: 1, reportUrl: "https://sonicpoint.vercel.app/report/s1" },
      }),
    })) as unknown as typeof fetch;
    const published = await publishViaPlatform(sampleSession(), "https://sonicpoint.vercel.app", undefined, okFetch);
    assert.equal(published.status, "published");

    const skipFetch = (async () => ({
      ok: true,
      json: async () => ({ status: "skipped", reason: "nothing valid" }),
    })) as unknown as typeof fetch;
    const skipped = await publishViaPlatform(sampleSession(), "https://sonicpoint.vercel.app", undefined, skipFetch);
    assert.equal(skipped.status, "skipped");
  });

  it("returns failed when the platform is unreachable", async () => {
    const downFetch = (async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    const outcome = await publishViaPlatform(sampleSession(), "https://sonicpoint.vercel.app", undefined, downFetch);
    assert.equal(outcome.status, "failed");
  });
});
