import type { PluginEntry } from "./config.ts";
import type { PackageSpec, WorkspaceSpec } from "./layout.ts";

export const SEMVER_PRERELEASE_OPTIONS = '{ prereleaseChannels: ["alpha", "beta", "rc"] }';

export const RELEASE_PLUGINS: readonly PluginEntry[] = [
  { name: "changesets" },
  { name: "changelog" },
  { name: "npm" },
  { name: "git" },
  { name: "github" },
  { name: "semver", options: SEMVER_PRERELEASE_OPTIONS },
];

export const SINGLE_PACKAGE: PackageSpec = { path: ".", name: "example", version: "1.0.0" };

export const CORE_PACKAGE: PackageSpec = {
  path: "packages/core",
  name: "@example/core",
  version: "1.0.0",
};

export const UI_PACKAGE: PackageSpec = {
  path: "packages/ui",
  name: "@example/ui",
  version: "1.0.0",
};

export const CLI_PACKAGE: PackageSpec = {
  path: "packages/cli",
  name: "@example/cli",
  version: "1.0.0",
};

export const SINGLE_PACKAGE_SPEC: WorkspaceSpec = {
  packages: [SINGLE_PACKAGE],
  config: { scopes: { example: "./" }, plugins: RELEASE_PLUGINS },
};

export const MONOREPO_SCOPES = {
  "@example/core": "packages/core",
  "@example/ui": "packages/ui",
};
