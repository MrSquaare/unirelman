import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatPrereleaseVersion,
  isValidPrereleaseChannel,
  parsePrereleaseVersion,
} from "./version";

describe("parsePrereleaseVersion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

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

  it("should keep leading hyphens in prerelease channel", () => {
    expect(parsePrereleaseVersion("1.2.3--beta.2")).toEqual({
      version: "1.2.3",
      prerelease: { channel: "-beta", increment: 2 },
    });
  });

  it("should keep hyphens before an invalid channel character in version", () => {
    expect(parsePrereleaseVersion("1.2.3-pre_beta-rc.1")).toEqual({
      version: "1.2.3-pre_beta",
      prerelease: { channel: "rc", increment: 1 },
    });
  });

  it("should keep incomplete prerelease suffix in version", () => {
    expect(parsePrereleaseVersion("1.2.3-beta")).toEqual({
      version: "1.2.3-beta",
      prerelease: undefined,
    });
  });

  it("should keep prerelease suffix with an empty channel in version", () => {
    expect(parsePrereleaseVersion("1.2.3-.1")).toEqual({
      version: "1.2.3-.1",
      prerelease: undefined,
    });
  });

  it("should keep prerelease suffix without version in version", () => {
    expect(parsePrereleaseVersion("-beta.1")).toEqual({
      version: "-beta.1",
      prerelease: undefined,
    });
  });

  it("should keep a long run of hyphens without increment in version", () => {
    const value = `a-${"---".repeat(100_000)}`;

    expect(parsePrereleaseVersion(value)).toEqual({
      version: value,
      prerelease: undefined,
    });
  });

  it("should parse a long run of hyphens as prerelease channel", () => {
    expect(parsePrereleaseVersion(`a-${"---".repeat(100_000)}.1`)).toEqual({
      version: "a",
      prerelease: { channel: "---".repeat(100_000), increment: 1 },
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
  afterEach(() => {
    vi.clearAllMocks();
  });

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
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should append prerelease channel and increment to version", () => {
    expect(formatPrereleaseVersion("1.2.3", { channel: "beta", increment: 2 })).toEqual(
      "1.2.3-beta.2",
    );
  });
});
