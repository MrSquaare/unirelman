import type { VersioningScheme } from "@unirelman/helpers/versioning";

import type { CalverDate, CalverGranularity, CalverVersion } from "./types";

import * as thisMod from "./scheme";

const CALVER_VERSION_PATTERNS = {
  day: /^(\d{4})\.(\d{2})\.(\d{2})\.(0|[1-9]\d*)$/,
  month: /^(\d{4})\.(\d{2})\.(0|[1-9]\d*)$/,
} as const satisfies Record<CalverGranularity, RegExp>;

export const parseCalverVersion = (
  value: string,
  granularity: CalverGranularity,
): CalverVersion | undefined => {
  const match = CALVER_VERSION_PATTERNS[granularity].exec(value);

  if (!match) {
    return undefined;
  }

  if (granularity === "month") {
    return {
      year: Number.parseInt(match[1], 10),
      month: Number.parseInt(match[2], 10),
      micro: Number.parseInt(match[3], 10),
    };
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
    micro: Number.parseInt(match[4], 10),
  };
};

export const formatCalverVersion = (version: CalverVersion): string => {
  const year = String(version.year).padStart(4, "0");
  const month = String(version.month).padStart(2, "0");
  const day = version.day === undefined ? [] : [String(version.day).padStart(2, "0")];

  return [year, month, ...day, version.micro].join(".");
};

export const resolveCalverDate = (date: Date, granularity: CalverGranularity): CalverDate => {
  if (granularity === "month") {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
    };
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

export const isSameCalverDate = (version: CalverVersion, date: CalverDate): boolean => {
  return version.year === date.year && version.month === date.month && version.day === date.day;
};

export const bumpCalverVersion = (
  version: CalverVersion,
  now: Date,
  granularity: CalverGranularity,
): CalverVersion => {
  const date = thisMod.resolveCalverDate(now, granularity);

  if (thisMod.isSameCalverDate(version, date)) {
    return { ...date, micro: version.micro + 1 };
  }

  return { ...date, micro: 0 };
};

export const readCurrentDate = (): Date => {
  return new Date();
};

export const createCalverScheme = (
  now: () => Date,
  granularity: CalverGranularity,
): VersioningScheme<CalverVersion> => {
  return {
    name: "calver",
    parse: (value) => thisMod.parseCalverVersion(value, granularity),
    format: formatCalverVersion,
    bumpRelease: (version) => thisMod.bumpCalverVersion(version, now(), granularity),
    isPrereleaseBaseStale: (version) =>
      !thisMod.isSameCalverDate(version, thisMod.resolveCalverDate(now(), granularity)),
  };
};
