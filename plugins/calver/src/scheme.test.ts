import { createChange } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./scheme";
import {
  bumpCalverVersion,
  createCalverScheme,
  formatCalverVersion,
  resolveCalverDate,
  readCurrentDate,
  isSameCalverDate,
  parseCalverVersion,
} from "./scheme";
import { createCalverVersion } from "./types.fixture";

describe("parseCalverVersion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse a day calver version", () => {
    expect(parseCalverVersion("2026.07.24.0", "day")).toEqual({
      year: 2026,
      month: 7,
      day: 24,
      micro: 0,
    });
  });

  it("should parse a month calver version", () => {
    expect(parseCalverVersion("2026.07.3", "month")).toEqual({ year: 2026, month: 7, micro: 3 });
  });

  it.each([
    ["2026.07.24.01", "day"],
    ["2026.07.01", "month"],
  ] as const)(
    "should return undefined when the micro of %s has a leading zero",
    (value, granularity) => {
      expect(parseCalverVersion(value, granularity)).toEqual(undefined);
    },
  );

  it("should return undefined when year format is invalid", () => {
    expect(parseCalverVersion("26.07.24.0", "day")).toEqual(undefined);
  });

  it("should return undefined when value is not a calver version", () => {
    expect(parseCalverVersion("v1.2.3", "day")).toEqual(undefined);
  });

  it("should return undefined when value contains a prerelease suffix", () => {
    expect(parseCalverVersion("2026.07.24.0-alpha.1", "day")).toEqual(undefined);
  });

  it("should return undefined when a day version is parsed with the month granularity", () => {
    expect(parseCalverVersion("2026.07.24.0", "month")).toEqual(undefined);
  });
});

describe("formatCalverVersion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format a day version with zero-padded date components", () => {
    expect(formatCalverVersion({ year: 2026, month: 7, day: 4, micro: 0 })).toEqual("2026.07.04.0");
  });

  it("should format a month version with zero-padded date components", () => {
    expect(formatCalverVersion({ year: 2026, month: 7, micro: 3 })).toEqual("2026.07.3");
  });
});

describe("resolveCalverDate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the day of the date", () => {
    expect(resolveCalverDate(new Date(Date.UTC(2025, 11, 31)), "day")).toEqual({
      year: 2025,
      month: 12,
      day: 31,
    });
  });

  it("should return the month of the date", () => {
    expect(resolveCalverDate(new Date(Date.UTC(2025, 11, 31)), "month")).toEqual({
      year: 2025,
      month: 12,
    });
  });

  it("should return the UTC day of a date given with another offset", () => {
    expect(resolveCalverDate(new Date("2025-12-31T23:30:00-02:00"), "day")).toEqual({
      year: 2026,
      month: 1,
      day: 1,
    });
  });
});

describe("isSameCalverDate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when version matches date", () => {
    expect(
      isSameCalverDate(createCalverVersion({ year: 2026, month: 7, day: 24, micro: 0 }), {
        year: 2026,
        month: 7,
        day: 24,
      }),
    ).toEqual(true);
  });

  it("should return true when a month version matches the month of date", () => {
    expect(isSameCalverDate({ year: 2026, month: 7, micro: 2 }, { year: 2026, month: 7 })).toEqual(
      true,
    );
  });

  it("should return false when version does not match date", () => {
    expect(
      isSameCalverDate(createCalverVersion({ year: 2026, month: 7, day: 24, micro: 0 }), {
        year: 2026,
        month: 7,
        day: 25,
      }),
    ).toEqual(false);
  });
});

describe("bumpCalverVersion", () => {
  const resolveCalverDateSpy = vi.spyOn(thisMod, "resolveCalverDate");
  const isSameCalverDateSpy = vi.spyOn(thisMod, "isSameCalverDate");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should increment micro on same date", () => {
    const now = new Date(Date.UTC(2026, 6, 24));
    const version = createCalverVersion({ year: 2026, month: 7, day: 24, micro: 0 });

    expect(bumpCalverVersion(version, now, "day")).toEqual({
      year: 2026,
      month: 7,
      day: 24,
      micro: 1,
    });
    expect(resolveCalverDateSpy).toHaveBeenCalledTimes(1);
    expect(resolveCalverDateSpy).toHaveBeenNthCalledWith(1, now, "day");
    expect(isSameCalverDateSpy).toHaveBeenCalledTimes(1);
    expect(isSameCalverDateSpy).toHaveBeenNthCalledWith(1, version, {
      year: 2026,
      month: 7,
      day: 24,
    });
  });

  it("should move to date and reset micro on new date", () => {
    expect(
      bumpCalverVersion(
        createCalverVersion({ year: 2026, month: 7, day: 24, micro: 5 }),
        new Date(Date.UTC(2026, 6, 25)),
        "day",
      ),
    ).toEqual({ year: 2026, month: 7, day: 25, micro: 0 });
  });

  it("should increment micro within the same month", () => {
    expect(
      bumpCalverVersion(
        { year: 2026, month: 7, micro: 2 },
        new Date(Date.UTC(2026, 6, 25)),
        "month",
      ),
    ).toEqual({ year: 2026, month: 7, micro: 3 });
  });

  it("should move to the month and reset micro on a new month", () => {
    expect(
      bumpCalverVersion(
        { year: 2026, month: 7, micro: 2 },
        new Date(Date.UTC(2026, 7, 1)),
        "month",
      ),
    ).toEqual({ year: 2026, month: 8, micro: 0 });
  });
});

describe("readCurrentDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 24)));

    expect(readCurrentDate()).toEqual(new Date(Date.UTC(2026, 6, 24)));
  });
});

describe("createCalverScheme", () => {
  const parseCalverVersionSpy = vi.spyOn(thisMod, "parseCalverVersion");
  const bumpCalverVersionSpy = vi.spyOn(thisMod, "bumpCalverVersion");
  const resolveCalverDateSpy = vi.spyOn(thisMod, "resolveCalverDate");
  const isSameCalverDateSpy = vi.spyOn(thisMod, "isSameCalverDate");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should describe the calver versioning scheme", () => {
    const scheme = createCalverScheme(() => new Date(Date.UTC(2026, 6, 24)), "day");

    expect(scheme).toEqual({
      name: "calver",
      parse: scheme.parse,
      format: formatCalverVersion,
      bumpRelease: scheme.bumpRelease,
      isPrereleaseBaseStale: scheme.isPrereleaseBaseStale,
    });
  });

  it("should parse versions with the granularity", () => {
    const scheme = createCalverScheme(() => new Date(Date.UTC(2026, 6, 24)), "month");

    expect(scheme.parse("2026.07.3")).toEqual({ year: 2026, month: 7, micro: 3 });
    expect(parseCalverVersionSpy).toHaveBeenCalledTimes(1);
    expect(parseCalverVersionSpy).toHaveBeenNthCalledWith(1, "2026.07.3", "month");
  });

  it("should bump release with date from clock", () => {
    const now = new Date(Date.UTC(2026, 6, 24));
    const version = createCalverVersion({ year: 2026, month: 7, day: 24, micro: 0 });
    const scheme = createCalverScheme(() => now, "day");

    expect(scheme.bumpRelease(version, [createChange()])).toEqual({
      year: 2026,
      month: 7,
      day: 24,
      micro: 1,
    });
    expect(bumpCalverVersionSpy).toHaveBeenCalledTimes(1);
    expect(bumpCalverVersionSpy).toHaveBeenNthCalledWith(1, version, now, "day");
  });

  it("should report stale prerelease base when clock date differs from version date", () => {
    const now = new Date(Date.UTC(2026, 6, 25));
    const version = createCalverVersion({ year: 2026, month: 7, day: 24, micro: 0 });
    const scheme = createCalverScheme(() => now, "day");

    expect(scheme.isPrereleaseBaseStale(version, [createChange()])).toEqual(true);
    expect(resolveCalverDateSpy).toHaveBeenCalledTimes(1);
    expect(resolveCalverDateSpy).toHaveBeenNthCalledWith(1, now, "day");
    expect(isSameCalverDateSpy).toHaveBeenCalledTimes(1);
    expect(isSameCalverDateSpy).toHaveBeenNthCalledWith(1, version, {
      year: 2026,
      month: 7,
      day: 25,
    });
  });

  it("should report fresh prerelease base when clock month matches version month", () => {
    const scheme = createCalverScheme(() => new Date(Date.UTC(2026, 6, 25)), "month");

    expect(
      scheme.isPrereleaseBaseStale({ year: 2026, month: 7, micro: 0 }, [createChange()]),
    ).toEqual(false);
  });
});
