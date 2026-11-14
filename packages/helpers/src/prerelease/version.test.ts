import { describe, expect, it } from "vitest";

import {
  formatPrereleaseVersion,
  isValidPrereleaseChannel,
  parsePrereleaseVersion,
} from "./version";

describe("parsePrereleaseVersion", () => {
  it("should return version without prerelease when value has no prerelease suffix", () => {
    expect(parsePrereleaseVersion("1.2.3")).toEqual({
      version: "1.2.3",
      prerelease: undefined,
    });
  });

  it("should split version and prerelease tag when value has a prerelease suffix", () => {
    expect(parsePrereleaseVersion("1.2.3-beta.2")).toEqual({
      version: "1.2.3",
      prerelease: { channel: "beta", increment: 2 },
    });
  });

  it("should keep hyphens in prerelease channel", () => {
    expect(parsePrereleaseVersion("2026.10.26.0-release-candidate.1")).toEqual({
      version: "2026.10.26.0",
      prerelease: { channel: "release-candidate", increment: 1 },
    });
  });

  it("should keep incomplete prerelease suffix in version", () => {
    expect(parsePrereleaseVersion("1.2.3-beta")).toEqual({
      version: "1.2.3-beta",
      prerelease: undefined,
    });
  });

  it("should return empty version without prerelease when value is empty", () => {
    expect(parsePrereleaseVersion("")).toEqual({
      version: "",
      prerelease: undefined,
    });
  });
});

describe("isValidPrereleaseChannel", () => {
  it("should accept a channel of letters", () => {
    expect(isValidPrereleaseChannel("beta")).toEqual(true);
  });

  it("should accept a channel with digits and hyphens", () => {
    expect(isValidPrereleaseChannel("release-candidate-2")).toEqual(true);
  });

  it("should reject a channel with a dot", () => {
    expect(isValidPrereleaseChannel("rc.1")).toEqual(false);
  });

  it("should reject a channel with another character", () => {
    expect(isValidPrereleaseChannel("rc_1")).toEqual(false);
  });

  it("should reject an empty channel", () => {
    expect(isValidPrereleaseChannel("")).toEqual(false);
  });
});

describe("formatPrereleaseVersion", () => {
  it("should append prerelease channel and increment to version", () => {
    expect(formatPrereleaseVersion("1.2.3", { channel: "beta", increment: 2 })).toEqual(
      "1.2.3-beta.2",
    );
  });
});
