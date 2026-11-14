import type { Change, ChangeLevel } from "@unirelman/core";
import type { VersioningScheme } from "@unirelman/helpers/versioning";
import type { NonEmptyArray } from "@unirelman/utils";

import { CHANGE_LEVELS } from "@unirelman/core";

import type { SemverVersion } from "./types";

import * as thisMod from "./scheme";

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export const parseSemverVersion = (value: string): SemverVersion | undefined => {
  const match = SEMVER_RE.exec(value);

  if (!match) {
    return undefined;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
};

export const formatSemverVersion = (version: SemverVersion): string => {
  return `${version.major}.${version.minor}.${version.patch}`;
};

export const resolveHighestChangeLevel = (changes: NonEmptyArray<Change>): ChangeLevel => {
  return changes.reduce<ChangeLevel>((highestLevel, change) => {
    return CHANGE_LEVELS.indexOf(change.level) > CHANGE_LEVELS.indexOf(highestLevel)
      ? change.level
      : highestLevel;
  }, "patch");
};

export const resolveSemverVersionLevel = (version: SemverVersion): ChangeLevel => {
  if (version.patch > 0) {
    return "patch";
  }

  if (version.minor > 0) {
    return "minor";
  }

  return "major";
};

export const bumpSemverVersion = (
  version: SemverVersion,
  changes: NonEmptyArray<Change>,
): SemverVersion => {
  switch (thisMod.resolveHighestChangeLevel(changes)) {
    case "major":
      return { major: version.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case "patch":
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
};

export const isSemverPrereleaseBaseStale = (
  version: SemverVersion,
  changes: NonEmptyArray<Change>,
): boolean => {
  return (
    CHANGE_LEVELS.indexOf(thisMod.resolveHighestChangeLevel(changes)) >
    CHANGE_LEVELS.indexOf(thisMod.resolveSemverVersionLevel(version))
  );
};

export const semverScheme = {
  name: "semver",
  parse: parseSemverVersion,
  format: formatSemverVersion,
  bumpRelease: bumpSemverVersion,
  isPrereleaseBaseStale: isSemverPrereleaseBaseStale,
} satisfies VersioningScheme<SemverVersion>;
