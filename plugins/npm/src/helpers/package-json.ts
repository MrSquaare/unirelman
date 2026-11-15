import type { FS, ScopeMap } from "@unirelman/core";
import type * as z from "zod";

import { CoreFileNotFoundError } from "@unirelman/core";
import { resolve } from "node:path";

import type { PackageJson, ScopePackageJson, ScopePackageJsonMap } from "../types";

import { NPM_PACKAGE_JSON_FILE_NAME } from "../constants";
import { NpmInvalidPackageJsonVersionError, NpmPackageJsonNotFoundError } from "../errors";
import { dependencyPackageJsonSchema } from "../types";
import * as thisMod from "./package-json";

export const readScopePackageJson = async <TSchema extends z.ZodType>(
  fs: FS,
  scopeName: string,
  filePath: string,
  schema: TSchema,
): Promise<z.output<TSchema>> => {
  try {
    return await fs.readJSON(filePath, schema);
  } catch (error) {
    if (error instanceof CoreFileNotFoundError) {
      throw new NpmPackageJsonNotFoundError(scopeName, filePath, { cause: error });
    }

    throw error;
  }
};

export const readScopePackageJsons = async (
  fs: FS,
  scopes: ScopeMap,
): Promise<ScopePackageJsonMap> => {
  const entries = await Promise.all(
    [...scopes].map(async ([scopeName, scope]): Promise<[string, ScopePackageJson]> => {
      const path = resolve(scope.path, NPM_PACKAGE_JSON_FILE_NAME);
      const packageJson = await thisMod.readScopePackageJson(
        fs,
        scopeName,
        path,
        dependencyPackageJsonSchema,
      );

      return [scopeName, { path, packageJson }];
    }),
  );

  return new Map(entries);
};

export const resolvePackageJsonVersion = (scopeName: string, packageJson: PackageJson): string => {
  const version = packageJson.version.trim();

  if (version.length === 0) {
    throw new NpmInvalidPackageJsonVersionError(scopeName);
  }

  return version;
};

export const resolveScopeNamesByPackageName = (
  packageJsons: ScopePackageJsonMap,
): ReadonlyMap<string, string> => {
  return new Map(
    [...packageJsons].map(([scopeName, { packageJson }]) => [packageJson.name, scopeName]),
  );
};
