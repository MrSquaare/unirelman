import { createChange } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./scheme";
import {
  bumpSemverVersion,
  formatSemverVersion,
  resolveSemverVersionLevel,
  isSemverPrereleaseBaseStale,
  parseSemverVersion,
  resolveHighestChangeLevel,
  semverScheme,
} from "./scheme";
import { createSemverVersion } from "./types.fixture";

describe("parseSemverVersion", () => {
  it("should parse semver version", () => {
    expect(parseSemverVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("should return undefined when value is not a semver version", () => {
    expect(parseSemverVersion("invalid")).toEqual(undefined);
  });

  it("should return undefined when value contains a prerelease suffix", () => {
    expect(parseSemverVersion("1.2.3-alpha.4")).toEqual(undefined);
  });
});

describe("formatSemverVersion", () => {
  it("should format version to a dot-separated string", () => {
    expect(formatSemverVersion({ major: 1, minor: 2, patch: 3 })).toEqual("1.2.3");
  });
});

describe("resolveHighestChangeLevel", () => {
  it("should return the highest change level", () => {
    expect(
      resolveHighestChangeLevel([
        createChange({ level: "patch" }),
        createChange({ level: "major" }),
        createChange({ level: "minor" }),
      ]),
    ).toEqual("major");
  });

  it("should return patch level when all changes are patches", () => {
    expect(resolveHighestChangeLevel([createChange({ level: "patch" })])).toEqual("patch");
  });
});

describe("resolveSemverVersionLevel", () => {
  it("should return patch level when patch is set", () => {
    expect(resolveSemverVersionLevel({ major: 1, minor: 2, patch: 3 })).toEqual("patch");
  });

  it("should return minor level when minor is the lowest set component", () => {
    expect(resolveSemverVersionLevel({ major: 1, minor: 2, patch: 0 })).toEqual("minor");
  });

  it("should return major level when minor and patch are zero", () => {
    expect(resolveSemverVersionLevel({ major: 1, minor: 0, patch: 0 })).toEqual("major");
  });
});

describe("bumpSemverVersion", () => {
  const resolveHighestChangeLevelSpy = vi.spyOn(thisMod, "resolveHighestChangeLevel");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should bump major and reset minor and patch for major changes", () => {
    const changes = [createChange({ level: "major" })] as const;

    expect(
      bumpSemverVersion(createSemverVersion({ major: 1, minor: 2, patch: 3 }), changes),
    ).toEqual({ major: 2, minor: 0, patch: 0 });
    expect(resolveHighestChangeLevelSpy).toHaveBeenCalledTimes(1);
    expect(resolveHighestChangeLevelSpy).toHaveBeenNthCalledWith(1, changes);
  });

  it("should bump minor and reset patch for minor changes", () => {
    expect(
      bumpSemverVersion(createSemverVersion({ major: 1, minor: 2, patch: 3 }), [
        createChange({ level: "minor" }),
      ]),
    ).toEqual({ major: 1, minor: 3, patch: 0 });
  });

  it("should bump patch for patch changes", () => {
    expect(
      bumpSemverVersion(createSemverVersion({ major: 1, minor: 2, patch: 3 }), [
        createChange({ level: "patch" }),
      ]),
    ).toEqual({
      major: 1,
      minor: 2,
      patch: 4,
    });
  });
});

describe("isSemverPrereleaseBaseStale", () => {
  const resolveHighestChangeLevelSpy = vi.spyOn(thisMod, "resolveHighestChangeLevel");
  const resolveSemverVersionLevelSpy = vi.spyOn(thisMod, "resolveSemverVersionLevel");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when changes exceed the prerelease base level", () => {
    const version = { major: 1, minor: 0, patch: 2 };
    const changes = [createChange({ level: "major" })] as const;

    expect(isSemverPrereleaseBaseStale(version, changes)).toEqual(true);
    expect(resolveHighestChangeLevelSpy).toHaveBeenCalledTimes(1);
    expect(resolveHighestChangeLevelSpy).toHaveBeenNthCalledWith(1, changes);
    expect(resolveSemverVersionLevelSpy).toHaveBeenCalledTimes(1);
    expect(resolveSemverVersionLevelSpy).toHaveBeenNthCalledWith(1, version);
  });

  it("should return false when changes do not exceed the prerelease base level", () => {
    expect(
      isSemverPrereleaseBaseStale({ major: 2, minor: 0, patch: 0 }, [
        createChange({ level: "minor" }),
      ]),
    ).toEqual(false);
  });
});

describe("semverScheme", () => {
  it("should describe the semver versioning scheme", () => {
    expect(semverScheme).toEqual({
      name: "semver",
      parse: parseSemverVersion,
      format: formatSemverVersion,
      bumpRelease: bumpSemverVersion,
      isPrereleaseBaseStale: isSemverPrereleaseBaseStale,
    });
  });
});
