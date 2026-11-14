import type { Change, Version, VersionMeta } from "@unirelman/core";
import type { NonEmptyArray } from "@unirelman/utils";

import { isNonEmptyArray } from "@unirelman/utils";

import type { PrereleaseTag } from "../prerelease/types";
import type { ParsedVersion, VersioningScheme } from "./types";

import { assertPrereleaseChannelTransition } from "../prerelease/transition";
import { formatPrereleaseVersion, parsePrereleaseVersion } from "../prerelease/version";
import { VersioningInvalidVersionError } from "./errors";
import * as thisMod from "./version";

export const parseVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  value: string,
): ParsedVersion<TVersion> => {
  const { version, prerelease } = parsePrereleaseVersion(value.trim());
  const base = scheme.parse(version);

  if (!base) {
    throw new VersioningInvalidVersionError(scheme.name, value);
  }

  return { base, prerelease };
};

export const formatVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
): string => {
  const formattedBase = scheme.format(version.base);

  if (!version.prerelease) {
    return formattedBase;
  }

  return formatPrereleaseVersion(formattedBase, version.prerelease);
};

export const resolveFlatVersion = <TVersion extends object>(
  version: ParsedVersion<TVersion>,
): TVersion | (TVersion & PrereleaseTag) => {
  if (!version.prerelease) {
    return version.base;
  }

  return { ...version.base, ...version.prerelease };
};

export const resolveVersionMeta = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
): VersionMeta => {
  const meta: VersionMeta = { [scheme.name]: thisMod.resolveFlatVersion(version) };

  if (!version.prerelease) {
    return meta;
  }

  return { ...meta, prerelease: version.prerelease };
};

export const resolveVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
): Version => {
  return {
    version: thisMod.formatVersion(scheme, version),
    meta: thisMod.resolveVersionMeta(scheme, version),
  };
};

export const bumpPrereleaseVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
  changes: NonEmptyArray<Change>,
  channel: string,
): ParsedVersion<TVersion> => {
  if (!version.prerelease || scheme.isPrereleaseBaseStale(version.base, changes)) {
    return {
      base: scheme.bumpRelease(version.base, changes),
      prerelease: { channel, increment: 0 },
    };
  }

  if (version.prerelease.channel !== channel) {
    return {
      base: version.base,
      prerelease: { channel, increment: 0 },
    };
  }

  return {
    base: version.base,
    prerelease: { channel, increment: version.prerelease.increment + 1 },
  };
};

export const resolveExitNextVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
  changes: readonly Change[],
  channel: string,
): ParsedVersion<TVersion> => {
  if (!isNonEmptyArray(changes)) {
    return { base: version.base, prerelease: undefined };
  }

  const nextVersion = thisMod.bumpPrereleaseVersion(scheme, version, changes, channel);

  return { base: nextVersion.base, prerelease: undefined };
};

export const resolvePrereleaseNextVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
  changes: NonEmptyArray<Change>,
  channel: string,
  channels: readonly string[],
): ParsedVersion<TVersion> => {
  assertPrereleaseChannelTransition(version.prerelease?.channel, channel, channels);

  return thisMod.bumpPrereleaseVersion(scheme, version, changes, channel);
};

export const resolveReleaseNextVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  version: ParsedVersion<TVersion>,
  changes: NonEmptyArray<Change>,
): ParsedVersion<TVersion> => {
  return { base: scheme.bumpRelease(version.base, changes), prerelease: undefined };
};
