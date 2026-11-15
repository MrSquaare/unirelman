import type { Plugin, ScopeVersionMap, Version } from "@unirelman/core";

import { resolve } from "node:path";

import { NPM_PACKAGE_JSON_FILE_NAME } from "../constants";
import { readScopePackageJson, resolvePackageJsonVersion } from "../helpers/package-json";
import { packageJsonSchema } from "../types";

export const runGetCurrentVersionPhase: NonNullable<Plugin["getCurrentVersion"]> = async (
  context,
): Promise<ScopeVersionMap> => {
  const currentVersions = new Map<string, Version>();

  for (const [scopeName, scope] of context.scopes) {
    const packageJsonPath = resolve(scope.path, NPM_PACKAGE_JSON_FILE_NAME);
    const packageJson = await readScopePackageJson(
      context.fs,
      scopeName,
      packageJsonPath,
      packageJsonSchema,
    );
    const version = resolvePackageJsonVersion(scopeName, packageJson);

    currentVersions.set(scopeName, {
      version,
      meta: {},
    });
  }

  return currentVersions;
};
