import type {
  Change,
  Plugin,
  ScopeVersionMap,
  ScopeVersionMetaMap,
  Version,
  VersionMeta,
} from "@unirelman/core";

import { isNonEmptyArray } from "@unirelman/utils";

import type { PrereleaseScopeState } from "../prerelease/types";
import type { NextVersion, ResolvedVersioningOptions, VersioningScheme } from "./types";

import { resolveGroups } from "../group/resolver";
import {
  resolveGroupTargetLabel,
  resolveGroupTargets,
  resolveIndependentScopes,
} from "../group/target";
import { readPrereleaseState, resolveGroupPrerelease } from "../prerelease/state";
import { resolvePrereleaseTransition } from "../prerelease/transition";
import {
  VersioningFixedVersionMismatchError,
  VersioningMissingCurrentVersionError,
} from "./errors";
import * as thisMod from "./phase";
import {
  parseVersion,
  resolveExitNextVersion,
  resolvePrereleaseNextVersion,
  resolveReleaseNextVersion,
  resolveVersion,
  resolveVersionMeta,
} from "./version";

const NEXT_VERSION_LABELS = {
  exit: "next release version",
  prerelease: "next prerelease version",
  release: "next version",
} as const satisfies Record<NextVersion["kind"], string>;

export const createParseCurrentVersionPhase = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
): NonNullable<Plugin["parseCurrentVersion"]> => {
  return async (context, state): Promise<ScopeVersionMetaMap> => {
    const versionMetas = new Map<string, VersionMeta>();

    for (const [scopeName, { version: currentVersion }] of state.currentVersions) {
      versionMetas.set(scopeName, resolveVersionMeta(scheme, parseVersion(scheme, currentVersion)));
    }

    return versionMetas;
  };
};

export const resolveNextVersion = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  prereleaseChannels: readonly string[],
  currentVersion: string,
  changes: readonly Change[],
  scopeState: PrereleaseScopeState | undefined,
): NextVersion | undefined => {
  const parsedVersion = parseVersion(scheme, currentVersion);
  const transition = resolvePrereleaseTransition({
    scopeState,
    currentChannel: parsedVersion.prerelease?.channel,
  });

  if (transition.kind === "exit") {
    return {
      kind: "exit",
      version: resolveVersion(
        scheme,
        resolveExitNextVersion(scheme, parsedVersion, changes, transition.channel),
      ),
    };
  }

  if (!isNonEmptyArray(changes)) {
    return undefined;
  }

  if (transition.kind === "prerelease") {
    return {
      kind: "prerelease",
      version: resolveVersion(
        scheme,
        resolvePrereleaseNextVersion(
          scheme,
          parsedVersion,
          changes,
          transition.channel,
          prereleaseChannels,
        ),
      ),
    };
  }

  return {
    kind: "release",
    version: resolveVersion(scheme, resolveReleaseNextVersion(scheme, parsedVersion, changes)),
  };
};

export const resolveSharedCurrentVersion = (
  scopes: readonly string[],
  currentVersions: ScopeVersionMap,
): string | undefined => {
  const versions = new Map(
    scopes.map((scopeName) => [scopeName, currentVersions.get(scopeName)?.version]),
  );
  const distinctVersions = new Set(versions.values());

  if (distinctVersions.size > 1) {
    throw new VersioningFixedVersionMismatchError(versions);
  }

  const [version] = distinctVersions;

  return version;
};

export const createComputeNextVersionPhase = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  options: ResolvedVersioningOptions,
): NonNullable<Plugin["computeNextVersion"]> => {
  return async (context, state): Promise<ScopeVersionMap> => {
    const prereleaseState = await readPrereleaseState(context.store);
    const scopeNames = [...context.scopes.keys()];
    const groups = resolveGroups(options.fixed, scopeNames);
    const targets = resolveGroupTargets(groups, resolveIndependentScopes(groups, scopeNames));
    const nextVersions = new Map<string, Version>();

    for (const target of targets) {
      const targetLabel = resolveGroupTargetLabel(target);
      const changes = target.scopes.flatMap((scopeName) => state.changes.get(scopeName) ?? []);
      const currentVersion = thisMod.resolveSharedCurrentVersion(
        target.scopes,
        state.currentVersions,
      );

      if (currentVersion === undefined) {
        if (changes.length > 0) {
          throw new VersioningMissingCurrentVersionError(target.scopes);
        }

        context.logger.debug(
          `No current version found for ${targetLabel}, skipping next version computation.`,
        );

        continue;
      }

      const nextVersion = thisMod.resolveNextVersion(
        scheme,
        options.prereleaseChannels,
        currentVersion,
        changes,
        resolveGroupPrerelease(prereleaseState, target.scopes),
      );

      if (!nextVersion) {
        context.logger.debug(
          `No changes found for ${targetLabel}, skipping next version computation.`,
        );

        continue;
      }

      context.logger.info(
        `Computed ${NEXT_VERSION_LABELS[nextVersion.kind]} for ${targetLabel}: ${nextVersion.version.version}`,
      );

      for (const scopeName of target.scopes) {
        nextVersions.set(scopeName, nextVersion.version);
      }
    }

    return nextVersions;
  };
};
