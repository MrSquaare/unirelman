import { join } from "node:path";

import { renderConfig, type ConfigSpec } from "./config.ts";

export type PackageSpec = {
  readonly path: string;
  readonly name: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

export type WorkspaceSpec = {
  readonly packages: readonly PackageSpec[];
  readonly config: ConfigSpec;
  readonly files?: Readonly<Record<string, string>>;
};

export type WorkspaceFiles = Readonly<Record<string, string>>;

const ROOT_PATH = ".";
const ROOT_PACKAGE: PackageSpec = { path: ROOT_PATH, name: "workspace-root", private: true };
const PACKAGE_JSON_FILE_NAME = "package.json";
const CONFIG_FILE_NAME = "unirelman.config.ts";
const PNPM_WORKSPACE_FILE_NAME = "pnpm-workspace.yaml";
const GITIGNORE_FILE_NAME = ".gitignore";

const renderPackageJson = (spec: PackageSpec): string => {
  return `${JSON.stringify(
    {
      name: spec.name,
      ...(spec.version === undefined ? {} : { version: spec.version }),
      ...(spec.private === undefined ? {} : { private: spec.private }),
      type: "module",
      ...(spec.dependencies === undefined ? {} : { dependencies: spec.dependencies }),
      ...(spec.devDependencies === undefined ? {} : { devDependencies: spec.devDependencies }),
    },
    null,
    2,
  )}\n`;
};

const renderPnpmWorkspace = (packagePaths: readonly string[]): string => {
  if (packagePaths.length === 0) {
    return "";
  }

  return ["packages:", ...packagePaths.map((path) => `  - "${path}"`), ""].join("\n");
};

export const renderWorkspaceFiles = (spec: WorkspaceSpec): WorkspaceFiles => {
  const hasRootPackage = spec.packages.some((packageSpec) => packageSpec.path === ROOT_PATH);
  const packages = hasRootPackage ? spec.packages : [ROOT_PACKAGE, ...spec.packages];
  const nestedPackagePaths = packages
    .map((packageSpec) => packageSpec.path)
    .filter((path) => path !== ROOT_PATH);

  return Object.fromEntries([
    [GITIGNORE_FILE_NAME, "node_modules/\n"],
    [PNPM_WORKSPACE_FILE_NAME, renderPnpmWorkspace(nestedPackagePaths)],
    [CONFIG_FILE_NAME, renderConfig(spec.config)],
    ...packages.map((packageSpec) => [
      join(packageSpec.path, PACKAGE_JSON_FILE_NAME),
      renderPackageJson(packageSpec),
    ]),
    ...Object.entries(spec.files ?? {}),
  ]);
};
