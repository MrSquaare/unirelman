import { describe, expect, it } from "vitest";

import {
  PrereleaseDowngradeChannelError,
  PrereleaseInvalidCurrentChannelError,
  PrereleaseInvalidTargetChannelError,
  PrereleaseNoChannelsConfiguredError,
} from "./errors";
import { assertPrereleaseChannelTransition, resolvePrereleaseTransition } from "./transition";

describe("resolvePrereleaseTransition", () => {
  it("should return exit with current channel when prerelease state was removed", () => {
    expect(
      resolvePrereleaseTransition({
        scopeState: undefined,
        currentChannel: "alpha",
      }),
    ).toEqual({ kind: "exit", channel: "alpha" });
  });

  it("should return prerelease with state channel when scope is in prerelease", () => {
    expect(
      resolvePrereleaseTransition({
        scopeState: { channel: "beta" },
        currentChannel: "alpha",
      }),
    ).toEqual({ kind: "prerelease", channel: "beta" });
  });

  it("should return release when scope is not in prerelease", () => {
    expect(
      resolvePrereleaseTransition({
        scopeState: undefined,
        currentChannel: undefined,
      }),
    ).toEqual({ kind: "release" });
  });

  it("should return prerelease when entering prerelease from a release version", () => {
    expect(
      resolvePrereleaseTransition({
        scopeState: { channel: "alpha" },
        currentChannel: undefined,
      }),
    ).toEqual({ kind: "prerelease", channel: "alpha" });
  });
});

describe("assertPrereleaseChannelTransition", () => {
  it("should accept entering a configured channel from a release version", () => {
    expect(assertPrereleaseChannelTransition(undefined, "alpha", ["alpha", "beta", "rc"])).toEqual(
      undefined,
    );
  });

  it("should accept staying on the current channel", () => {
    expect(assertPrereleaseChannelTransition("beta", "beta", ["alpha", "beta", "rc"])).toEqual(
      undefined,
    );
  });

  it("should accept upgrading to a higher channel", () => {
    expect(assertPrereleaseChannelTransition("alpha", "rc", ["alpha", "beta", "rc"])).toEqual(
      undefined,
    );
  });

  it("should throw when prerelease channels are not configured", () => {
    expect(() => assertPrereleaseChannelTransition("alpha", "alpha", [])).toThrow(
      new PrereleaseNoChannelsConfiguredError(),
    );
  });

  it("should throw when target prerelease channel is invalid", () => {
    expect(() =>
      assertPrereleaseChannelTransition("alpha", "dev", ["alpha", "beta", "rc"]),
    ).toThrow(new PrereleaseInvalidTargetChannelError("dev", ["alpha", "beta", "rc"]));
  });

  it("should throw when entering prerelease and target channel is invalid", () => {
    expect(() =>
      assertPrereleaseChannelTransition(undefined, "dev", ["alpha", "beta", "rc"]),
    ).toThrow(new PrereleaseInvalidTargetChannelError("dev", ["alpha", "beta", "rc"]));
  });

  it("should throw when current prerelease channel is invalid", () => {
    expect(() =>
      assertPrereleaseChannelTransition("dev", "alpha", ["alpha", "beta", "rc"]),
    ).toThrow(new PrereleaseInvalidCurrentChannelError("dev", ["alpha", "beta", "rc"]));
  });

  it("should throw when prerelease channel transition is downgraded", () => {
    expect(() =>
      assertPrereleaseChannelTransition("beta", "alpha", ["alpha", "beta", "rc"]),
    ).toThrow(new PrereleaseDowngradeChannelError("beta", "alpha", ["alpha", "beta", "rc"]));
  });
});
