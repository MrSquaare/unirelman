import { join } from "node:path";
import * as z from "zod";

import type { Git } from "./git.ts";

const packageJsonSchema = z.looseObject({
  version: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

export type PackageJson = z.infer<typeof packageJsonSchema>;

const HEAD = "HEAD";
const PACKAGE_JSON_FILE_NAME = "package.json";
const CHANGELOG_FILE_NAME = "CHANGELOG.md";

export const readPackageJson = async (
  git: Git,
  packagePath: string,
  ref = HEAD,
): Promise<PackageJson> => {
  const content = await git.readFileAt(ref, join(packagePath, PACKAGE_JSON_FILE_NAME));

  return packageJsonSchema.parse(JSON.parse(content));
};

export const readPackageVersion = async (
  git: Git,
  packagePath: string,
  ref = HEAD,
): Promise<string | undefined> => {
  return (await readPackageJson(git, packagePath, ref)).version;
};

export const readChangelog = (git: Git, packagePath: string, ref = HEAD): Promise<string> => {
  return git.readFileAt(ref, join(packagePath, CHANGELOG_FILE_NAME));
};
