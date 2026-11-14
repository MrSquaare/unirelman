import type { FS, Plugin, ScopeReleasesMap } from "@unirelman/core";
import type { PrereleaseTag } from "@unirelman/helpers/prerelease";

import { execCommand, parseJSON, runWithCleanup } from "@unirelman/utils";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as z from "zod";

import type { NpmPackageManager, PublishPackageJson, ResolvedNpmPluginOptions } from "../types";

import { NPM_PACKAGE_JSON_FILE_NAME, NPM_PACKAGE_RELEASE_TYPE } from "../constants";
import {
  NpmPublishAuthError,
  NpmPublishError,
  NpmRegistryLookupError,
  NpmTarballNotFoundError,
  NpmUnresolvedSpecifierError,
} from "../errors";
import { readScopePackageJson, resolvePackageJsonVersion } from "../helpers/package-json";
import {
  findUnresolvedSpecifier,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePackCommand,
  runPackageScript,
} from "../helpers/package-manager";
import { packageManagerManifestSchema, publishPackageJsonSchema } from "../types";
import * as thisMod from "./create-releases";

const NPM_ALLOWED_EXIT_CODES = [0, 1] as const;
const NPM_NOT_FOUND_ERROR_CODE = "E404";
const NPM_AUTH_ERROR_CODES = ["ENEEDAUTH", "E401", "E403", "EOTP"];
const NPM_TARBALL_EXTENSION = ".tgz";
const PACK_DIRECTORY_PREFIX = "unirelman-npm-";

const npmErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    summary: z.string(),
  }),
});

export const hasNpmVersion = async (
  packageName: string,
  version: string,
  cwd: string,
): Promise<boolean> => {
  const packageSpec = `${packageName}@${version}`;
  const result = await execCommand("npm", ["view", packageSpec, "version", "--json"], {
    cwd,
    allowedExitCodes: NPM_ALLOWED_EXIT_CODES,
  });

  if (result.exitCode === 0) {
    return true;
  }

  const output = parseJSON(`npm view ${packageSpec}`, result.stdout, npmErrorSchema);

  if (output.error.code === NPM_NOT_FOUND_ERROR_CODE) {
    return false;
  }

  throw new NpmRegistryLookupError(packageName, version, output.error.summary);
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

export const packPackage = async (
  packageManager: NpmPackageManager,
  cwd: string,
  destination: string,
  packageName: string,
): Promise<string> => {
  const { command, args } = resolvePackCommand(packageManager, destination);

  await execCommand(command, args, { cwd });

  const tarballName = (await readdir(destination)).find((fileName) =>
    fileName.endsWith(NPM_TARBALL_EXTENSION),
  );

  if (tarballName === undefined) {
    throw new NpmTarballNotFoundError(packageName, destination);
  }

  return join(destination, tarballName);
};

export const runNpmPublish = async (
  packageSpec: string,
  tarballPath: string,
  cwd: string,
  prerelease: PrereleaseTag | undefined,
): Promise<void> => {
  const tagArgs = prerelease ? ["--tag", prerelease.channel] : [];
  const result = await execCommand("npm", ["publish", tarballPath, "--json", ...tagArgs], {
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
  packageJson: PublishPackageJson,
  packageSpec: string,
  prerelease: PrereleaseTag | undefined,
): Promise<void> => {
  const packDirectory = await mkdtemp(join(tmpdir(), PACK_DIRECTORY_PREFIX));

  await runWithCleanup(
    async () => {
      await runPackageScript(packageManager, cwd, packageJson, "prepublishOnly");

      const tarballPath = await thisMod.packPackage(
        packageManager,
        cwd,
        packDirectory,
        packageJson.name,
      );

      await thisMod.runNpmPublish(packageSpec, tarballPath, cwd, prerelease);
      await runPackageScript(packageManager, cwd, packageJson, "publish");
      await runPackageScript(packageManager, cwd, packageJson, "postpublish");
    },
    () => rm(packDirectory, { recursive: true, force: true }),
  );
};

export const createCreateReleasesPhase = (
  options: ResolvedNpmPluginOptions,
): NonNullable<Plugin["createReleases"]> => {
  return async (context, state): Promise<ScopeReleasesMap> => {
    const releases: ScopeReleasesMap = {};

    if (!options.publish) {
      context.logger.info("Skipping npm publish: publish disabled");

      return releases;
    }

    for (const scopeName in context.scopes) {
      const scope = context.scopes[scopeName];
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

      const versionExists = await thisMod.hasNpmVersion(packageJson.name, version, scope.path);

      releases[scopeName] = [
        {
          type: NPM_PACKAGE_RELEASE_TYPE,
          name: packageSpec,
          status: versionExists ? "existing" : "created",
          meta: {},
        },
      ];

      if (versionExists) {
        context.logger.info(
          `Skipping npm publish for ${scopeName}: ${packageSpec} already published`,
        );

        continue;
      }

      const packageManager = await thisMod.readScopePackageManager(
        context.fs,
        context.cwd,
        scope.path,
        options.packageManager,
      );
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
        packageJson,
        packageSpec,
        state.currentVersions[scopeName]?.meta.prerelease,
      );
      context.logger.info(`Published ${packageSpec}`);
    }

    return releases;
  };
};
