import type { FS, ScopeMap } from "@unirelman/core";
import type * as z from "zod";

import { CoreFileNotFoundError } from "@unirelman/core";
import { resolve } from "node:path";

import type { PackageJson, ScopePackageJsonMap } from "../types";

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
    Object.entries(scopes).map(async ([scopeName, scope]) => [
      scopeName,
      await thisMod.readScopePackageJson(
        fs,
        scopeName,
        resolve(scope.path, NPM_PACKAGE_JSON_FILE_NAME),
        dependencyPackageJsonSchema,
      ),
    ]),
  );

  return Object.fromEntries(entries);
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
    Object.entries(packageJsons).map(([scopeName, packageJson]) => [packageJson.name, scopeName]),
  );
};
