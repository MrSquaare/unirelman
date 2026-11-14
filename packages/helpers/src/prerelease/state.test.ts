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

    vi.mocked(context.store.readJSON).mockResolvedValueOnce({
      alpha: { channel: "beta" },
    });

    await expect(readPrereleaseState(context.store)).resolves.toEqual({
      alpha: { channel: "beta" },
    });
    expect(context.store.readJSON).toHaveBeenCalledTimes(1);
    expect(context.store.readJSON).toHaveBeenNthCalledWith(
      1,
      "prerelease.json",
      prereleaseStateSchema,
      {},
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
      writePrereleaseState(context.store, { alpha: { channel: "beta" } }),
    ).resolves.toEqual(undefined);
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {
      alpha: { channel: "beta" },
    });
  });
});

describe("resolveGroupPrerelease", () => {
  it("should return the prerelease state shared by every scope", () => {
    expect(
      resolveGroupPrerelease({ alpha: { channel: "beta" }, beta: { channel: "beta" } }, [
        "alpha",
        "beta",
      ]),
    ).toEqual({ channel: "beta" });
  });

  it("should return undefined when no scope is in prerelease", () => {
    expect(resolveGroupPrerelease({}, ["alpha", "beta"])).toEqual(undefined);
  });

  it("should return the state of a single scope", () => {
    expect(resolveGroupPrerelease({ alpha: { channel: "rc" } }, ["alpha"])).toEqual({
      channel: "rc",
    });
  });

  it("should return undefined for an empty group", () => {
    expect(resolveGroupPrerelease({ alpha: { channel: "rc" } }, [])).toEqual(undefined);
  });

  it("should throw when scopes have different prerelease states", () => {
    expect(() => resolveGroupPrerelease({ alpha: { channel: "beta" } }, ["alpha", "beta"])).toThrow(
      new PrereleaseStateMismatchError({ alpha: "beta", beta: undefined }),
    );
  });
});
