import type { VersioningScheme } from "@unirelman/helpers/versioning";

import type { CalverDate, CalverGranularity, CalverVersion } from "./types";

import { CalverFutureVersionError } from "./errors";
import * as thisMod from "./scheme";

const CALVER_VERSION_PATTERNS = {
  day: /^(\d{4})\.(\d{2})\.(\d{2})\.(0|[1-9]\d*)$/,
  month: /^(\d{4})\.(\d{2})\.(0|[1-9]\d*)$/,
} as const satisfies Record<CalverGranularity, RegExp>;

export const isValidCalverDate = (date: CalverDate): boolean => {
  const day = date.day ?? 1;
  const timestamp = new Date(Date.UTC(date.year, date.month - 1, day));

  return (
    timestamp.getUTCFullYear() === date.year &&
    timestamp.getUTCMonth() === date.month - 1 &&
    timestamp.getUTCDate() === day
  );
};

export const parseCalverVersion = (
  value: string,
  granularity: CalverGranularity,
): CalverVersion | undefined => {
  const match = CALVER_VERSION_PATTERNS[granularity].exec(value);

  if (!match) {
    return undefined;
  }

  const version =
    granularity === "month"
      ? {
          year: Number.parseInt(match[1], 10),
          month: Number.parseInt(match[2], 10),
          micro: Number.parseInt(match[3], 10),
        }
      : {
          year: Number.parseInt(match[1], 10),
          month: Number.parseInt(match[2], 10),
          day: Number.parseInt(match[3], 10),
          micro: Number.parseInt(match[4], 10),
        };

  if (!thisMod.isValidCalverDate(version)) {
    return undefined;
  }

  return version;
};

export const formatCalverDate = (date: CalverDate): string => {
  const year = String(date.year).padStart(4, "0");
  const month = String(date.month).padStart(2, "0");
  const day = date.day === undefined ? [] : [String(date.day).padStart(2, "0")];

  return [year, month, ...day].join(".");
};

export const formatCalverVersion = (version: CalverVersion): string => {
  return `${thisMod.formatCalverDate(version)}.${version.micro}`;
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

export const isCalverDateAfter = (left: CalverDate, right: CalverDate): boolean => {
  const leftParts = [left.year, left.month, left.day ?? 0];
  const rightParts = [right.year, right.month, right.day ?? 0];
  const index = leftParts.findIndex((part, partIndex) => part !== rightParts[partIndex]);

  return index !== -1 && leftParts[index] > rightParts[index];
};

export const bumpCalverVersion = (
  version: CalverVersion,
  now: Date,
  granularity: CalverGranularity,
): CalverVersion => {
  const date = thisMod.resolveCalverDate(now, granularity);

  if (thisMod.isCalverDateAfter(version, date)) {
    throw new CalverFutureVersionError(
      thisMod.formatCalverVersion(version),
      thisMod.formatCalverDate(date),
    );
  }

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
