import { execCommand } from "@unirelman/utils";
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
const YARN_TARBALL_FILE_NAME = "package.tgz";
const YARN_CLASSIC_MAJOR_VERSION = "1";
const PNPM_DISABLE_PRE_POST_SCRIPTS_OPTION = "--config.enable-pre-post-scripts=false";
const NPM_IGNORE_SCRIPTS_OPTION = "--ignore-scripts";

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

export const resolvePackCommand = (
  packageManager: NpmPackageManager,
  destination: string,
): PackageManagerCommand => {
  switch (packageManager) {
    case "npm":
    case "pnpm":
      return { command: packageManager, args: ["pack", "--pack-destination", destination] };
    case "yarn":
      return {
        command: "yarn",
        args: ["pack", "--out", join(destination, YARN_TARBALL_FILE_NAME)],
      };
    case "bun":
      return { command: "bun", args: ["pm", "pack", "--destination", destination] };
  }
};

export const resolveRunScriptCommand = (
  packageManager: NpmPackageManager,
  script: string,
): PackageManagerCommand => {
  switch (packageManager) {
    case "npm":
    case "bun":
      return { command: "npm", args: ["run", NPM_IGNORE_SCRIPTS_OPTION, script] };
    case "pnpm":
      return { command: "pnpm", args: [PNPM_DISABLE_PRE_POST_SCRIPTS_OPTION, "run", script] };
    case "yarn":
      return { command: "yarn", args: ["run", script] };
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

export const runPackageScript = async (
  packageManager: NpmPackageManager,
  cwd: string,
  packageJson: PublishPackageJson,
  script: string,
): Promise<void> => {
  if (packageJson.scripts?.[script] === undefined) {
    return;
  }

  const { command, args } = thisMod.resolveRunScriptCommand(packageManager, script);

  await execCommand(command, args, { cwd });
};
