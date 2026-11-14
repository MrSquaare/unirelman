import type { ScopeVersionMap } from "@unirelman/core";

import * as semver from "semver";

import type {
  DependencyPackageJson,
  NpmDependencyField,
  NpmInternalDependencyRanges,
  NpmInternalDependents,
  ResolvedNpmUpdateInternalDependenciesOptions,
  UpdatedInternalDependency,
} from "../types";

import { NpmUnsupportedDependencyRangeError } from "../errors";
import { NPM_DEPENDENCY_FIELDS } from "../types";
import * as thisMod from "./dependencies";

export type UpdatedInternalDependenciesParams = {
  readonly scopeNamesByPackageName: ReadonlyMap<string, string>;
  readonly currentVersions: ScopeVersionMap;
  readonly nextVersions: ScopeVersionMap;
};

const WORKSPACE_PROTOCOL = "workspace:";
const WORKSPACE_ANY_RANGE = "*";
const WORKSPACE_PREFIX_RANGES = ["^", "~"] as const;
const SPECIFIER_PREFIXES = ["^", "~"] as const;
const MINOR_OR_MAJOR_DIFFS = ["major", "premajor", "minor", "preminor"] as const;
const DEV_DEPENDENCY_FIELD = "devDependencies";

export const resolveDependencyRange = (
  specifier: string,
  currentVersion: string,
): string | undefined => {
  if (!specifier.startsWith(WORKSPACE_PROTOCOL)) {
    return semver.validRange(specifier) === null ? undefined : specifier;
  }

  const workspaceRange = specifier.slice(WORKSPACE_PROTOCOL.length);

  if (workspaceRange === WORKSPACE_ANY_RANGE) {
    return currentVersion;
  }

  if (WORKSPACE_PREFIX_RANGES.some((prefix) => prefix === workspaceRange)) {
    return `${workspaceRange}${currentVersion}`;
  }

  return semver.validRange(workspaceRange) === null ? undefined : workspaceRange;
};

export const resolveUpdatedInternalDependency = (
  field: NpmDependencyField,
  name: string,
  specifier: string,
  params: UpdatedInternalDependenciesParams,
): UpdatedInternalDependency | undefined => {
  const dependencyScopeName = params.scopeNamesByPackageName.get(name);

  if (dependencyScopeName === undefined) {
    return undefined;
  }

  const currentVersion = params.currentVersions[dependencyScopeName]?.version;
  const nextVersion = params.nextVersions[dependencyScopeName]?.version;

  if (!currentVersion || !nextVersion || semver.valid(nextVersion) === null) {
    return undefined;
  }

  const range = thisMod.resolveDependencyRange(specifier, currentVersion);

  if (range === undefined) {
    return undefined;
  }

  const isOutOfRange = !semver.satisfies(nextVersion, range);

  return { field, name, specifier, currentVersion, nextVersion, isOutOfRange };
};

export const resolveUpdatedInternalDependencies = (
  packageJson: DependencyPackageJson,
  params: UpdatedInternalDependenciesParams,
): UpdatedInternalDependency[] => {
  return NPM_DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(packageJson[field] ?? {}).flatMap(([name, specifier]) => {
      const dependency = thisMod.resolveUpdatedInternalDependency(field, name, specifier, params);

      return dependency === undefined ? [] : [dependency];
    }),
  );
};

export const isMinorOrMajorVersionChange = (dependency: UpdatedInternalDependency): boolean => {
  const diff = semver.diff(dependency.currentVersion, dependency.nextVersion);

  return MINOR_OR_MAJOR_DIFFS.some((minorOrMajorDiff) => minorOrMajorDiff === diff);
};

export const isTriggeringDependents = (
  dependency: UpdatedInternalDependency,
  dependents: NpmInternalDependents,
): boolean => {
  return dependents === "always" || dependency.isOutOfRange;
};

export const isDependentUpdateRequired = (
  dependency: UpdatedInternalDependency,
  dependents: NpmInternalDependents,
): boolean => {
  return (
    dependency.field !== DEV_DEPENDENCY_FIELD &&
    thisMod.isTriggeringDependents(dependency, dependents)
  );
};

export const isDevRangeUpdateRequired = (
  dependency: UpdatedInternalDependency,
  dependents: NpmInternalDependents,
): boolean => {
  return (
    dependency.field === DEV_DEPENDENCY_FIELD &&
    thisMod.isTriggeringDependents(dependency, dependents)
  );
};

export const isRangeUpdateRequired = (
  dependency: UpdatedInternalDependency,
  ranges: NpmInternalDependencyRanges,
): boolean => {
  return (
    ranges === "patch" || dependency.isOutOfRange || thisMod.isMinorOrMajorVersionChange(dependency)
  );
};

export const resolveNextRangeSpecifier = (
  specifier: string,
  nextVersion: string,
): string | undefined => {
  const prefix = SPECIFIER_PREFIXES.find((specifierPrefix) =>
    specifier.startsWith(specifierPrefix),
  );
  const version = specifier.slice(prefix?.length ?? 0);

  if (semver.valid(version) === null) {
    return undefined;
  }

  return `${prefix ?? ""}${nextVersion}`;
};

export const resolveNextSpecifier = (
  specifier: string,
  nextVersion: string,
): string | undefined => {
  if (!specifier.startsWith(WORKSPACE_PROTOCOL)) {
    return thisMod.resolveNextRangeSpecifier(specifier, nextVersion);
  }

  const workspaceRange = specifier.slice(WORKSPACE_PROTOCOL.length);

  if (
    workspaceRange === WORKSPACE_ANY_RANGE ||
    WORKSPACE_PREFIX_RANGES.some((prefix) => prefix === workspaceRange)
  ) {
    return specifier;
  }

  const nextWorkspaceRange = thisMod.resolveNextRangeSpecifier(workspaceRange, nextVersion);

  return nextWorkspaceRange === undefined
    ? undefined
    : `${WORKSPACE_PROTOCOL}${nextWorkspaceRange}`;
};

export const resolveNextDependencySpecifier = (
  dependentScopeName: string,
  dependency: UpdatedInternalDependency,
): string => {
  const nextSpecifier = thisMod.resolveNextSpecifier(dependency.specifier, dependency.nextVersion);

  if (nextSpecifier !== undefined) {
    return nextSpecifier;
  }

  if (dependency.isOutOfRange) {
    throw new NpmUnsupportedDependencyRangeError(
      dependentScopeName,
      dependency.name,
      dependency.specifier,
      dependency.nextVersion,
    );
  }

  return dependency.specifier;
};

export const isDependencyChangeRequired = (
  dependency: UpdatedInternalDependency,
  isDependentUpdated: boolean,
  options: ResolvedNpmUpdateInternalDependenciesOptions,
): boolean => {
  if (thisMod.isDependentUpdateRequired(dependency, options.dependents)) {
    return true;
  }

  return (
    isDependentUpdated &&
    dependency.field !== DEV_DEPENDENCY_FIELD &&
    thisMod.isRangeUpdateRequired(dependency, options.ranges)
  );
};
