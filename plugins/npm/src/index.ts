import type { Plugin } from "@unirelman/core";

import type { NpmPluginOptions } from "./types";

import { resolveNpmPluginOptions } from "./helpers/options";
import { createCreateReleasesPhase } from "./phases/create-releases";
import { createGenerateFileOperationsPhase } from "./phases/generate-file-operations";
import { runGetCurrentVersionPhase } from "./phases/get-current-version";
import { createGetDependencyChangesPhase } from "./phases/get-dependency-changes";

export {
  NpmError,
  NpmInvalidPackageJsonVersionError,
  NpmPackageJsonNotFoundError,
  NpmPublishAuthError,
  NpmPublishError,
  NpmRegistryLookupError,
  NpmTarballNotFoundError,
  NpmUnresolvedSpecifierError,
  NpmUnsupportedDependencyRangeError,
  NpmUnsupportedPackageManagerError,
} from "./errors";

export type {
  NpmInternalDependencyRanges,
  NpmInternalDependents,
  NpmPackageManager,
  NpmPluginOptions,
  NpmUpdateInternalDependenciesOptions,
  PackageJson,
} from "./types";

export const createNpmPlugin = (options: NpmPluginOptions = {}): Plugin => {
  const resolvedOptions = resolveNpmPluginOptions(options);

  return {
    name: "npm",
    getCurrentVersion: runGetCurrentVersionPhase,
    getDependencyChanges: createGetDependencyChangesPhase(resolvedOptions),
    generateFileOperations: createGenerateFileOperationsPhase(resolvedOptions),
    createReleases: createCreateReleasesPhase(resolvedOptions),
  };
};
