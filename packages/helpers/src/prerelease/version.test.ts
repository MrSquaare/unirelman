import { describe, expect, it } from "vitest";

import { formatPrereleaseVersion, parsePrereleaseVersion } from "./version";

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

describe("formatPrereleaseVersion", () => {
  it("should append prerelease channel and increment to version", () => {
    expect(formatPrereleaseVersion("1.2.3", { channel: "beta", increment: 2 })).toEqual(
      "1.2.3-beta.2",
    );
  });
});
