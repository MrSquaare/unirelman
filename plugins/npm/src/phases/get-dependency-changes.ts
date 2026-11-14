import type { Change, Plugin, ScopeChangesMap } from "@unirelman/core";

import type { ResolvedNpmPluginOptions, UpdatedInternalDependency } from "../types";

import { NPM_DEPENDENCY_CHANGE_MESSAGE } from "../constants";
import {
  isDependencyChangeRequired,
  resolveUpdatedInternalDependencies,
} from "../helpers/dependencies";
import { readScopePackageJsons, resolveScopeNamesByPackageName } from "../helpers/package-json";
import * as thisMod from "./get-dependency-changes";

export const resolveDependencyChange = (
  dependencies: readonly UpdatedInternalDependency[],
): Change => {
  const specs = new Set(dependencies.map(({ name, nextVersion }) => `${name}@${nextVersion}`));

  return {
    message: `${NPM_DEPENDENCY_CHANGE_MESSAGE}: ${[...specs].join(", ")}`,
    level: "patch",
    meta: {},
  };
};

export const createGetDependencyChangesPhase = (
  options: ResolvedNpmPluginOptions,
): NonNullable<Plugin["getDependencyChanges"]> => {
  return async (context, state): Promise<ScopeChangesMap> => {
    const packageJsons = await readScopePackageJsons(context.fs, context.scopes);
    const params = {
      scopeNamesByPackageName: resolveScopeNamesByPackageName(packageJsons),
      currentVersions: state.currentVersions,
      nextVersions: state.nextVersions,
    };
    const changes: ScopeChangesMap = {};

    for (const scopeName in packageJsons) {
      const isDependentUpdated = state.nextVersions[scopeName] !== undefined;
      const dependenciesRequiringChange = resolveUpdatedInternalDependencies(
        packageJsons[scopeName],
        params,
      ).filter((dependency) =>
        isDependencyChangeRequired(
          dependency,
          isDependentUpdated,
          options.updateInternalDependencies,
        ),
      );

      if (dependenciesRequiringChange.length === 0) {
        continue;
      }

      changes[scopeName] = [thisMod.resolveDependencyChange(dependenciesRequiringChange)];
    }

    return changes;
  };
};
