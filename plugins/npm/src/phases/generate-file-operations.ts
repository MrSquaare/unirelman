import type { Plugin, ScopeFileOperationsMap } from "@unirelman/core";

import { resolve } from "node:path";

import type {
  DependencyPackageJson,
  PackageJsonDocument,
  ResolvedNpmPluginOptions,
  ResolvedNpmUpdateInternalDependenciesOptions,
  UpdatedInternalDependency,
} from "../types";

import { NPM_PACKAGE_JSON_FILE_TYPE, NPM_PACKAGE_JSON_FILE_NAME } from "../constants";
import {
  isDevRangeUpdateRequired,
  isRangeUpdateRequired,
  resolveUpdatedInternalDependencies,
  resolveNextDependencySpecifier,
} from "../helpers/dependencies";
import {
  readScopePackageJson,
  readScopePackageJsons,
  resolveScopeNamesByPackageName,
} from "../helpers/package-json";
import { NPM_DEPENDENCY_FIELDS, packageJsonDocumentSchema } from "../types";
import * as thisMod from "./generate-file-operations";

export const serializePackageJson = (document: PackageJsonDocument): string => {
  return `${JSON.stringify(document, null, 2)}\n`;
};

export const resolveDependenciesRequiringRangeUpdate = (
  dependencies: readonly UpdatedInternalDependency[],
  isDependentUpdated: boolean,
  options: ResolvedNpmUpdateInternalDependenciesOptions,
): UpdatedInternalDependency[] => {
  if (isDependentUpdated) {
    return dependencies.filter((dependency) => isRangeUpdateRequired(dependency, options.ranges));
  }

  return dependencies.filter((dependency) =>
    isDevRangeUpdateRequired(dependency, options.dependents),
  );
};

export const resolveDependencyFields = (
  dependentScopeName: string,
  dependentPackageJson: DependencyPackageJson,
  dependencies: readonly UpdatedInternalDependency[],
): PackageJsonDocument => {
  return Object.fromEntries(
    NPM_DEPENDENCY_FIELDS.flatMap((field) => {
      const fieldDependencies = dependentPackageJson[field];

      if (fieldDependencies === undefined) {
        return [];
      }

      const fieldEntries = Object.entries(fieldDependencies).map(([name, specifier]) => {
        const dependency = dependencies.find(
          (candidate) => candidate.field === field && candidate.name === name,
        );

        if (!dependency) {
          return [name, specifier];
        }

        return [name, resolveNextDependencySpecifier(dependentScopeName, dependency)];
      });

      return [[field, Object.fromEntries(fieldEntries)]];
    }),
  );
};

export const createGenerateFileOperationsPhase = (
  options: ResolvedNpmPluginOptions,
): NonNullable<Plugin["generateFileOperations"]> => {
  return async (context, state): Promise<ScopeFileOperationsMap> => {
    const packageJsons = await readScopePackageJsons(context.fs, context.scopes);
    const params = {
      scopeNamesByPackageName: resolveScopeNamesByPackageName(packageJsons),
      currentVersions: state.currentVersions,
      nextVersions: state.nextVersions,
    };
    const fileOperations: ScopeFileOperationsMap = {};

    for (const scopeName in packageJsons) {
      const packageJson = packageJsons[scopeName];
      const nextVersion = state.nextVersions[scopeName]?.version;
      const isDependentUpdated = nextVersion !== undefined;
      const dependenciesRequiringRangeUpdate = thisMod.resolveDependenciesRequiringRangeUpdate(
        resolveUpdatedInternalDependencies(packageJson, params),
        isDependentUpdated,
        options.updateInternalDependencies,
      );

      if (!isDependentUpdated && dependenciesRequiringRangeUpdate.length === 0) {
        continue;
      }

      const packageJsonPath = resolve(context.scopes[scopeName].path, NPM_PACKAGE_JSON_FILE_NAME);
      const document = await readScopePackageJson(
        context.fs,
        scopeName,
        packageJsonPath,
        packageJsonDocumentSchema,
      );

      fileOperations[scopeName] = [
        {
          type: NPM_PACKAGE_JSON_FILE_TYPE,
          path: packageJsonPath,
          action: "write",
          content: thisMod.serializePackageJson({
            ...document,
            version: nextVersion ?? packageJson.version,
            ...thisMod.resolveDependencyFields(
              scopeName,
              packageJson,
              dependenciesRequiringRangeUpdate,
            ),
          }),
          meta: {},
        },
      ];
    }

    return fileOperations;
  };
};
