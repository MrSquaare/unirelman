import { createPluginContext } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrereleaseStateMismatchError } from "./errors";
import { readPrereleaseState, resolveGroupPrerelease, writePrereleaseState } from "./state";
import { prereleaseStateSchema } from "./types";

describe("readPrereleaseState", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read prerelease state from store with its schema", async () => {
    const context = createPluginContext();

    vi.mocked(context.store.readJSON).mockResolvedValueOnce(
      new Map([["alpha", { channel: "beta" }]]),
    );

    await expect(readPrereleaseState(context.store)).resolves.toEqual(
      new Map([["alpha", { channel: "beta" }]]),
    );
    expect(context.store.readJSON).toHaveBeenCalledTimes(1);
    expect(context.store.readJSON).toHaveBeenNthCalledWith(
      1,
      "prerelease.json",
      prereleaseStateSchema,
      new Map(),
    );
  });
});

describe("writePrereleaseState", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write prerelease state to store", async () => {
    const context = createPluginContext();

    await expect(
      writePrereleaseState(context.store, new Map([["alpha", { channel: "beta" }]])),
    ).resolves.toEqual(undefined);
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {
      alpha: { channel: "beta" },
    });
  });
});

describe("resolveGroupPrerelease", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the prerelease state shared by every scope", () => {
    expect(
      resolveGroupPrerelease(
        new Map([
          ["alpha", { channel: "beta" }],
          ["beta", { channel: "beta" }],
        ]),
        ["alpha", "beta"],
      ),
    ).toEqual({ channel: "beta" });
  });

  it("should return undefined when no scope is in prerelease", () => {
    expect(resolveGroupPrerelease(new Map(), ["alpha", "beta"])).toEqual(undefined);
  });

  it("should return the state of a single scope", () => {
    expect(resolveGroupPrerelease(new Map([["alpha", { channel: "rc" }]]), ["alpha"])).toEqual({
      channel: "rc",
    });
  });

  it("should return undefined for an empty group", () => {
    expect(resolveGroupPrerelease(new Map([["alpha", { channel: "rc" }]]), [])).toEqual(undefined);
  });

  it("should throw when scopes have different prerelease states", () => {
    expect(() =>
      resolveGroupPrerelease(new Map([["alpha", { channel: "beta" }]]), ["alpha", "beta"]),
    ).toThrow(
      new PrereleaseStateMismatchError(
        new Map([
          ["alpha", "beta"],
          ["beta", undefined],
        ]),
      ),
    );
  });
});
