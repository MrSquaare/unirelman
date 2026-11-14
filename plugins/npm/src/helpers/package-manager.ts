import type { PrereleaseTag } from "@unirelman/helpers/prerelease";

import { join, relative, sep } from "node:path";

import type { NpmPackageManager, PackageManagerManifest, PublishPackageJson } from "../types";

import { DEFAULT_NPM_PACKAGE_MANAGER } from "../constants";
import { NpmUnsupportedPackageManagerError, NpmUnsupportedYarnClassicError } from "../errors";
import { NPM_PACKAGE_MANAGERS } from "../types";
import * as thisMod from "./package-manager";

export type PackageManagerCommand = {
  readonly command: NpmPackageManager;
  readonly args: readonly string[];
};

export type UnresolvedSpecifier = {
  readonly dependencyName: string;
  readonly specifier: string;
};

const UNRESOLVED_SPECIFIER_PROTOCOLS = ["workspace:", "catalog:"] as const;
const PUBLISHED_DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;
const YARN_CLASSIC_MAJOR_VERSION = "1";

export const isNpmPackageManager = (value: string): value is NpmPackageManager => {
  return NPM_PACKAGE_MANAGERS.some((packageManager) => packageManager === value);
};

export const parsePackageManagerField = (field: string): NpmPackageManager => {
  const [name = "", version = ""] = field.trim().split("@");

  if (!thisMod.isNpmPackageManager(name)) {
    throw new NpmUnsupportedPackageManagerError(field, NPM_PACKAGE_MANAGERS);
  }

  if (name === "yarn" && version.split(".")[0] === YARN_CLASSIC_MAJOR_VERSION) {
    throw new NpmUnsupportedYarnClassicError(field);
  }

  return name;
};

export const resolveManifestDirectories = (cwd: string, scopePath: string): string[] => {
  const segments = relative(cwd, scopePath)
    .split(sep)
    .filter((segment) => segment.length > 0);

  return [
    ...segments.map((_segment, index) => join(cwd, ...segments.slice(0, segments.length - index))),
    cwd,
  ];
};

export const resolvePackageManager = (
  manifests: readonly PackageManagerManifest[],
): NpmPackageManager => {
  const packageManagerField = manifests.find(
    (manifest) => manifest.packageManager !== undefined,
  )?.packageManager;

  if (packageManagerField === undefined) {
    return DEFAULT_NPM_PACKAGE_MANAGER;
  }

  return thisMod.parsePackageManagerField(packageManagerField);
};

export const resolvePublishCommand = (
  packageManager: NpmPackageManager,
  prerelease: PrereleaseTag | undefined,
): PackageManagerCommand => {
  const tagArgs = prerelease === undefined ? [] : ["--tag", prerelease.channel];

  switch (packageManager) {
    case "npm":
      return { command: "npm", args: ["publish", "--json", ...tagArgs] };
    case "pnpm":
      return { command: "pnpm", args: ["publish", "--no-git-checks", ...tagArgs] };
    case "yarn":
      return { command: "yarn", args: ["npm", "publish", ...tagArgs] };
    case "bun":
      return { command: "bun", args: ["publish", ...tagArgs] };
  }
};

export const findUnresolvedSpecifier = (
  packageJson: PublishPackageJson,
): UnresolvedSpecifier | undefined => {
  for (const field of PUBLISHED_DEPENDENCY_FIELDS) {
    for (const [dependencyName, specifier] of Object.entries(packageJson[field] ?? {})) {
      if (UNRESOLVED_SPECIFIER_PROTOCOLS.some((protocol) => specifier.startsWith(protocol))) {
        return { dependencyName, specifier };
      }
    }
  }

  return undefined;
};
