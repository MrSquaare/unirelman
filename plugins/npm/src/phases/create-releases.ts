import type { FS, Plugin, Release, ScopeReleasesMap } from "@unirelman/core";
import type { PrereleaseTag } from "@unirelman/helpers/prerelease";

import { execCommand, parseJSON } from "@unirelman/utils";
import { join, resolve } from "node:path";
import * as z from "zod";

import type { NpmPackageManager, PublishPackageJson, ResolvedNpmPluginOptions } from "../types";

import { NPM_PACKAGE_JSON_FILE_NAME, NPM_PACKAGE_RELEASE_TYPE } from "../constants";
import {
  NpmPublishAuthError,
  NpmPublishError,
  NpmRegistryLookupError,
  NpmUnresolvedSpecifierError,
} from "../errors";
import { readScopePackageJson, resolvePackageJsonVersion } from "../helpers/package-json";
import {
  findUnresolvedSpecifier,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePublishCommand,
} from "../helpers/package-manager";
import { packageManagerManifestSchema, publishPackageJsonSchema } from "../types";
import * as thisMod from "./create-releases";

const NPM_ALLOWED_EXIT_CODES = [0, 1] as const;
const NPM_NOT_FOUND_ERROR_CODE = "E404";
const PNPM_NOT_FOUND_ERROR_CODES = ["E404", "ERR_PNPM_PACKAGE_NOT_FOUND", "ERR_PNPM_FETCH_404"];
const YARN_PACKAGE_NOT_FOUND_ERROR = 35;
const LINE_BREAK = "\n";
const NPM_AUTH_ERROR_CODES = ["ENEEDAUTH", "E401", "E403", "EOTP"];
const PACKAGE_SCOPE_PREFIX = "@";
const PACKAGE_SCOPE_SEPARATOR = "/";

const npmErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    summary: z.string(),
  }),
});

const pnpmErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    summary: z.string().optional(),
    message: z.string().optional(),
  }),
});

const yarnInfoSchema = z.object({
  version: z.string(),
});

const yarnErrorSchema = z.object({
  name: z.number(),
  data: z.string(),
});

export const resolveRegistryArgs = (packageJson: PublishPackageJson): string[] => {
  const { name, publishConfig } = packageJson;

  if (publishConfig === undefined) {
    return [];
  }

  const scope = name.startsWith(PACKAGE_SCOPE_PREFIX)
    ? name.split(PACKAGE_SCOPE_SEPARATOR)[0]
    : undefined;
  const scopedRegistryKey = scope === undefined ? undefined : `${scope}:registry`;
  const scopedRegistry =
    scopedRegistryKey === undefined ? undefined : publishConfig[scopedRegistryKey];

  return [
    ...(typeof scopedRegistry === "string" ? [`--${scopedRegistryKey}=${scopedRegistry}`] : []),
    ...(publishConfig.registry === undefined ? [] : [`--registry=${publishConfig.registry}`]),
  ];
};

export const hasNpmVersion = async (
  packageName: string,
  version: string,
  cwd: string,
  registryArgs: readonly string[],
): Promise<boolean> => {
  const packageSpec = `${packageName}@${version}`;
  const result = await execCommand(
    "npm",
    ["view", packageSpec, "version", "--json", ...registryArgs],
    {
      cwd,
      allowedExitCodes: NPM_ALLOWED_EXIT_CODES,
    },
  );

  if (result.exitCode === 0) {
    return true;
  }

  const output = parseJSON(`npm view ${packageSpec}`, result.stdout, npmErrorSchema);

  if (output.error.code === NPM_NOT_FOUND_ERROR_CODE) {
    return false;
  }

  throw new NpmRegistryLookupError(packageName, version, output.error.summary);
};

export const hasPnpmVersion = async (
  packageName: string,
  version: string,
  cwd: string,
): Promise<boolean> => {
  const packageSpec = `${packageName}@${version}`;
  const result = await execCommand("pnpm", ["info", packageSpec, "version", "--json"], {
    cwd,
    allowedExitCodes: NPM_ALLOWED_EXIT_CODES,
  });

  if (result.exitCode === 0) {
    return true;
  }

  const { error } = parseJSON(`pnpm info ${packageSpec}`, result.stdout, pnpmErrorSchema);

  if (PNPM_NOT_FOUND_ERROR_CODES.includes(error.code)) {
    return false;
  }

  throw new NpmRegistryLookupError(
    packageName,
    version,
    error.summary ?? error.message ?? error.code,
  );
};

export const hasYarnVersion = async (
  packageName: string,
  version: string,
  cwd: string,
): Promise<boolean> => {
  const packageSpec = `${packageName}@${version}`;
  const result = await execCommand(
    "yarn",
    ["npm", "info", packageSpec, "--fields", "version", "--json"],
    { cwd, allowedExitCodes: NPM_ALLOWED_EXIT_CODES },
  );
  const [firstLine = ""] = result.stdout.split(LINE_BREAK);

  if (result.exitCode === 0) {
    return parseJSON(`yarn npm info ${packageSpec}`, firstLine, yarnInfoSchema).version === version;
  }

  const error = parseJSON(`yarn npm info ${packageSpec}`, firstLine, yarnErrorSchema);

  if (error.name === YARN_PACKAGE_NOT_FOUND_ERROR) {
    return false;
  }

  throw new NpmRegistryLookupError(packageName, version, error.data);
};

export const hasPublishedVersion = async (
  packageManager: NpmPackageManager,
  packageJson: PublishPackageJson,
  version: string,
  cwd: string,
): Promise<boolean> => {
  switch (packageManager) {
    case "npm":
    case "bun":
      return thisMod.hasNpmVersion(
        packageJson.name,
        version,
        cwd,
        thisMod.resolveRegistryArgs(packageJson),
      );
    case "pnpm":
      return thisMod.hasPnpmVersion(packageJson.name, version, cwd);
    case "yarn":
      return thisMod.hasYarnVersion(packageJson.name, version, cwd);
  }
};

export const readScopePackageManager = async (
  fs: FS,
  cwd: string,
  scopePath: string,
  packageManager: NpmPackageManager | undefined,
): Promise<NpmPackageManager> => {
  if (packageManager !== undefined) {
    return packageManager;
  }

  const manifests = await Promise.all(
    resolveManifestDirectories(cwd, scopePath).map((directory) =>
      fs.readJSON(join(directory, NPM_PACKAGE_JSON_FILE_NAME), packageManagerManifestSchema, {}),
    ),
  );

  return resolvePackageManager(manifests);
};

export const runNpmPublish = async (
  packageSpec: string,
  cwd: string,
  args: readonly string[],
): Promise<void> => {
  const result = await execCommand("npm", args, {
    cwd,
    allowedExitCodes: NPM_ALLOWED_EXIT_CODES,
  });

  if (result.exitCode === 0) {
    return;
  }

  const { error } = parseJSON(`npm publish ${packageSpec}`, result.stdout, npmErrorSchema);

  if (error.code !== undefined && NPM_AUTH_ERROR_CODES.includes(error.code)) {
    throw new NpmPublishAuthError(packageSpec, error.code);
  }

  throw new NpmPublishError(packageSpec, error.summary);
};

export const publishPackage = async (
  packageManager: NpmPackageManager,
  cwd: string,
  packageSpec: string,
  prerelease: PrereleaseTag | undefined,
): Promise<void> => {
  const { command, args } = resolvePublishCommand(packageManager, prerelease);

  if (packageManager === "npm") {
    await thisMod.runNpmPublish(packageSpec, cwd, args);

    return;
  }

  await execCommand(command, args, { cwd });
};

export const createCreateReleasesPhase = (
  options: ResolvedNpmPluginOptions,
): NonNullable<Plugin["createReleases"]> => {
  return async (context, state): Promise<ScopeReleasesMap> => {
    const releases = new Map<string, Release[]>();

    if (!options.publish) {
      context.logger.info("Skipping npm publish: publish disabled");

      return releases;
    }

    for (const [scopeName, scope] of context.scopes) {
      const packageJsonPath = resolve(scope.path, NPM_PACKAGE_JSON_FILE_NAME);
      const packageJson = await readScopePackageJson(
        context.fs,
        scopeName,
        packageJsonPath,
        publishPackageJsonSchema,
      );
      const version = resolvePackageJsonVersion(scopeName, packageJson);
      const packageSpec = `${packageJson.name}@${version}`;

      if (packageJson.private) {
        context.logger.info(`Skipping npm publish for ${scopeName}: package is private`);

        continue;
      }

      const packageManager = await thisMod.readScopePackageManager(
        context.fs,
        context.cwd,
        scope.path,
        options.packageManager,
      );
      const versionExists = await thisMod.hasPublishedVersion(
        packageManager,
        packageJson,
        version,
        scope.path,
      );

      releases.set(scopeName, [
        {
          type: NPM_PACKAGE_RELEASE_TYPE,
          name: packageSpec,
          status: versionExists ? "existing" : "created",
          meta: {},
        },
      ]);

      if (versionExists) {
        context.logger.info(
          `Skipping npm publish for ${scopeName}: ${packageSpec} already published`,
        );

        continue;
      }

      const unresolvedSpecifier =
        packageManager === "npm" ? findUnresolvedSpecifier(packageJson) : undefined;

      if (unresolvedSpecifier !== undefined) {
        throw new NpmUnresolvedSpecifierError(
          packageJson.name,
          unresolvedSpecifier.dependencyName,
          unresolvedSpecifier.specifier,
        );
      }

      if (context.dryRun) {
        context.logger.info(`Would publish ${packageSpec}`);

        continue;
      }

      await thisMod.publishPackage(
        packageManager,
        scope.path,
        packageSpec,
        state.currentVersions.get(scopeName)?.meta.prerelease,
      );
      context.logger.info(`Published ${packageSpec}`);
    }

    return releases;
  };
};
