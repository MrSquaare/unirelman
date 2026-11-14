import { mockedAssertPrereleaseChannelTransition } from "../prerelease/transition.mock";

import type { Change } from "@unirelman/core";
import type { NonEmptyArray } from "@unirelman/utils";

import { createChange } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VersioningInvalidVersionError } from "./errors";
import { createVersioningScheme } from "./types.fixture";
import * as thisMod from "./version";
import {
  bumpPrereleaseVersion,
  resolveFlatVersion,
  formatVersion,
  parseVersion,
  resolveExitNextVersion,
  resolvePrereleaseNextVersion,
  resolveReleaseNextVersion,
  resolveVersion,
  resolveVersionMeta,
} from "./version";

const changes: NonEmptyArray<Change> = [createChange()];

describe("parseVersion", () => {
  it("should parse release version with scheme", () => {
    const scheme = createVersioningScheme();
    const parseSpy = vi.spyOn(scheme, "parse");

    expect(parseVersion(scheme, "3")).toEqual({ base: { value: 3 }, prerelease: undefined });
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenNthCalledWith(1, "3");
  });

  it("should parse prerelease version with scheme", () => {
    const scheme = createVersioningScheme();
    const parseSpy = vi.spyOn(scheme, "parse");

    expect(parseVersion(scheme, "3-beta.1")).toEqual({
      base: { value: 3 },
      prerelease: { channel: "beta", increment: 1 },
    });
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenNthCalledWith(1, "3");
  });

  it("should trim value before parsing", () => {
    const scheme = createVersioningScheme();

    expect(parseVersion(scheme, " 3 ")).toEqual({ base: { value: 3 }, prerelease: undefined });
  });

  it("should throw when scheme cannot parse version", () => {
    const scheme = createVersioningScheme();

    expect(() => parseVersion(scheme, "invalid")).toThrow(
      new VersioningInvalidVersionError("counter", "invalid"),
    );
  });
});

describe("formatVersion", () => {
  it("should format release version with scheme", () => {
    const scheme = createVersioningScheme();
    const formatSpy = vi.spyOn(scheme, "format");

    expect(formatVersion(scheme, { base: { value: 3 }, prerelease: undefined })).toEqual("3");
    expect(formatSpy).toHaveBeenCalledTimes(1);
    expect(formatSpy).toHaveBeenNthCalledWith(1, { value: 3 });
  });

  it("should append prerelease tag to formatted version", () => {
    const scheme = createVersioningScheme();

    expect(
      formatVersion(scheme, { base: { value: 3 }, prerelease: { channel: "beta", increment: 1 } }),
    ).toEqual("3-beta.1");
  });
});

describe("resolveFlatVersion", () => {
  it("should return base when version has no prerelease tag", () => {
    expect(resolveFlatVersion({ base: { value: 3 }, prerelease: undefined })).toEqual({ value: 3 });
  });

  it("should merge base and prerelease tag when version has a prerelease tag", () => {
    expect(
      resolveFlatVersion({ base: { value: 3 }, prerelease: { channel: "beta", increment: 1 } }),
    ).toEqual({ value: 3, channel: "beta", increment: 1 });
  });
});

describe("resolveVersionMeta", () => {
  const resolveFlatVersionSpy = vi.spyOn(thisMod, "resolveFlatVersion");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the flattened version under the scheme name and the prerelease tag", () => {
    const scheme = createVersioningScheme();
    const version = { base: { value: 3 }, prerelease: { channel: "beta", increment: 1 } };

    expect(resolveVersionMeta(scheme, version)).toEqual({
      counter: { value: 3, channel: "beta", increment: 1 },
      prerelease: { channel: "beta", increment: 1 },
    });
    expect(resolveFlatVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveFlatVersionSpy).toHaveBeenNthCalledWith(1, version);
  });

  it("should omit the prerelease tag for a release version", () => {
    const scheme = createVersioningScheme();

    expect(resolveVersionMeta(scheme, { base: { value: 3 }, prerelease: undefined })).toEqual({
      counter: { value: 3 },
    });
  });
});

describe("resolveVersion", () => {
  const formatVersionSpy = vi.spyOn(thisMod, "formatVersion");
  const resolveVersionMetaSpy = vi.spyOn(thisMod, "resolveVersionMeta");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should build version with formatted value and its meta", () => {
    const scheme = createVersioningScheme();
    const version = { base: { value: 3 }, prerelease: { channel: "beta", increment: 1 } };

    expect(resolveVersion(scheme, version)).toEqual({
      version: "3-beta.1",
      meta: {
        counter: { value: 3, channel: "beta", increment: 1 },
        prerelease: { channel: "beta", increment: 1 },
      },
    });
    expect(formatVersionSpy).toHaveBeenCalledTimes(1);
    expect(formatVersionSpy).toHaveBeenNthCalledWith(1, scheme, version);
    expect(resolveVersionMetaSpy).toHaveBeenCalledTimes(1);
    expect(resolveVersionMetaSpy).toHaveBeenNthCalledWith(1, scheme, version);
  });
});

describe("bumpPrereleaseVersion", () => {
  it("should bump release and start channel when version is not a prerelease", () => {
    const scheme = createVersioningScheme();
    const bumpReleaseSpy = vi.spyOn(scheme, "bumpRelease");
    const isPrereleaseBaseStaleSpy = vi.spyOn(scheme, "isPrereleaseBaseStale");

    expect(
      bumpPrereleaseVersion(
        scheme,
        { base: { value: 3 }, prerelease: undefined },
        changes,
        "alpha",
      ),
    ).toEqual({ base: { value: 4 }, prerelease: { channel: "alpha", increment: 0 } });
    expect(isPrereleaseBaseStaleSpy).not.toHaveBeenCalled();
    expect(bumpReleaseSpy).toHaveBeenCalledTimes(1);
    expect(bumpReleaseSpy).toHaveBeenNthCalledWith(1, { value: 3 }, changes);
  });

  it("should bump release and restart channel when prerelease base is stale", () => {
    const scheme = createVersioningScheme();
    const bumpReleaseSpy = vi.spyOn(scheme, "bumpRelease");
    const isPrereleaseBaseStaleSpy = vi.spyOn(scheme, "isPrereleaseBaseStale");

    isPrereleaseBaseStaleSpy.mockReturnValueOnce(true);

    expect(
      bumpPrereleaseVersion(
        scheme,
        { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } },
        changes,
        "alpha",
      ),
    ).toEqual({ base: { value: 4 }, prerelease: { channel: "alpha", increment: 0 } });
    expect(isPrereleaseBaseStaleSpy).toHaveBeenCalledTimes(1);
    expect(isPrereleaseBaseStaleSpy).toHaveBeenNthCalledWith(1, { value: 3 }, changes);
    expect(bumpReleaseSpy).toHaveBeenCalledTimes(1);
    expect(bumpReleaseSpy).toHaveBeenNthCalledWith(1, { value: 3 }, changes);
  });

  it("should keep base and reset increment when channel changes", () => {
    const scheme = createVersioningScheme();
    const bumpReleaseSpy = vi.spyOn(scheme, "bumpRelease");

    expect(
      bumpPrereleaseVersion(
        scheme,
        { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } },
        changes,
        "beta",
      ),
    ).toEqual({ base: { value: 3 }, prerelease: { channel: "beta", increment: 0 } });
    expect(bumpReleaseSpy).not.toHaveBeenCalled();
  });

  it("should keep base and increment when channel is unchanged", () => {
    const scheme = createVersioningScheme();
    const bumpReleaseSpy = vi.spyOn(scheme, "bumpRelease");

    expect(
      bumpPrereleaseVersion(
        scheme,
        { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } },
        changes,
        "alpha",
      ),
    ).toEqual({ base: { value: 3 }, prerelease: { channel: "alpha", increment: 3 } });
    expect(bumpReleaseSpy).not.toHaveBeenCalled();
  });
});

describe("resolveExitNextVersion", () => {
  const bumpPrereleaseVersionSpy = vi.spyOn(thisMod, "bumpPrereleaseVersion");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should release bumped prerelease base when changes exist", () => {
    const scheme = createVersioningScheme();
    const version = { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } };

    bumpPrereleaseVersionSpy.mockReturnValueOnce({
      base: { value: 4 },
      prerelease: { channel: "alpha", increment: 0 },
    });

    expect(resolveExitNextVersion(scheme, version, changes, "alpha")).toEqual({
      base: { value: 4 },
      prerelease: undefined,
    });
    expect(bumpPrereleaseVersionSpy).toHaveBeenCalledTimes(1);
    expect(bumpPrereleaseVersionSpy).toHaveBeenNthCalledWith(1, scheme, version, changes, "alpha");
  });

  it("should release current prerelease base when no changes exist", () => {
    const scheme = createVersioningScheme();

    expect(
      resolveExitNextVersion(
        scheme,
        { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } },
        [],
        "alpha",
      ),
    ).toEqual({ base: { value: 3 }, prerelease: undefined });
    expect(bumpPrereleaseVersionSpy).not.toHaveBeenCalled();
  });
});

describe("resolvePrereleaseNextVersion", () => {
  const bumpPrereleaseVersionSpy = vi.spyOn(thisMod, "bumpPrereleaseVersion");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should assert channel transition from current channel and bump prerelease", () => {
    const scheme = createVersioningScheme();
    const version = { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } };
    const nextVersion = { base: { value: 3 }, prerelease: { channel: "beta", increment: 0 } };

    bumpPrereleaseVersionSpy.mockReturnValueOnce(nextVersion);

    expect(
      resolvePrereleaseNextVersion(scheme, version, changes, "beta", ["alpha", "beta"]),
    ).toEqual(nextVersion);
    expect(mockedAssertPrereleaseChannelTransition).toHaveBeenCalledTimes(1);
    expect(mockedAssertPrereleaseChannelTransition).toHaveBeenNthCalledWith(1, "alpha", "beta", [
      "alpha",
      "beta",
    ]);
    expect(bumpPrereleaseVersionSpy).toHaveBeenCalledTimes(1);
    expect(bumpPrereleaseVersionSpy).toHaveBeenNthCalledWith(1, scheme, version, changes, "beta");
  });

  it("should assert channel transition without current channel when version is not a prerelease", () => {
    const scheme = createVersioningScheme();
    const version = { base: { value: 3 }, prerelease: undefined };
    const nextVersion = { base: { value: 4 }, prerelease: { channel: "alpha", increment: 0 } };

    bumpPrereleaseVersionSpy.mockReturnValueOnce(nextVersion);

    expect(resolvePrereleaseNextVersion(scheme, version, changes, "alpha", ["alpha"])).toEqual(
      nextVersion,
    );
    expect(mockedAssertPrereleaseChannelTransition).toHaveBeenCalledTimes(1);
    expect(mockedAssertPrereleaseChannelTransition).toHaveBeenNthCalledWith(1, undefined, "alpha", [
      "alpha",
    ]);
  });
});

describe("resolveReleaseNextVersion", () => {
  it("should bump release version with scheme", () => {
    const scheme = createVersioningScheme();
    const bumpReleaseSpy = vi.spyOn(scheme, "bumpRelease");

    expect(
      resolveReleaseNextVersion(scheme, { base: { value: 3 }, prerelease: undefined }, changes),
    ).toEqual({ base: { value: 4 }, prerelease: undefined });
    expect(bumpReleaseSpy).toHaveBeenCalledTimes(1);
    expect(bumpReleaseSpy).toHaveBeenNthCalledWith(1, { value: 3 }, changes);
  });
});
