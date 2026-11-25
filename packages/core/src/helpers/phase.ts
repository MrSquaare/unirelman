import { resolve } from "node:path";

import type {
  FileOperation,
  PhaseName,
  PhaseState,
  ScopeChangesMap,
  ScopeFileOperationsMap,
  ScopeVersionMap,
  ScopeVersionMetaMap,
} from "../types/phases";
import type { PluginRegistration } from "../types/plugin";

import {
  CoreConflictingFileOperationError,
  CoreConflictingPhaseProvidersError,
  CoreEmptyFileOperationPathError,
  CoreMissingPhaseProviderError,
  CoreUnknownPhaseResultScopeError,
  CoreUnstableNextVersionError,
} from "../errors";
import * as thisMod from "./phase";
import { filterScopeResultMap } from "./scope";

const SINGLE_PROVIDER_PHASE_NAMES = [
  "getCurrentVersion",
  "parseCurrentVersion",
  "computeNextVersion",
  "getReleaseNotes",
] as const satisfies readonly PhaseName[];

const DISCARDED_RESULT_PHASE_NAMES: ReadonlySet<PhaseName> = new Set([
  "initialize",
  "prepare",
  "finalize",
  "teardown",
]);

const CHANGED_SCOPE_PHASE_NAMES = [
  "getCurrentVersion",
  "computeNextVersion",
] as const satisfies readonly PhaseName[];

export const assertChangedScopeProviders = (
  pluginRegistrations: readonly PluginRegistration[],
  changes: ScopeChangesMap,
): void => {
  for (const [scopeName, scopeChanges] of changes) {
    if (scopeChanges.length === 0) {
      continue;
    }

    for (const phaseName of CHANGED_SCOPE_PHASE_NAMES) {
      const hasProvider = pluginRegistrations.some(
        ({ plugin, scopes }) => scopes.has(scopeName) && typeof plugin[phaseName] === "function",
      );

      if (!hasProvider) {
        throw new CoreMissingPhaseProviderError(phaseName, scopeName);
      }
    }
  }
};

export const assertSinglePhaseProviders = (
  pluginRegistrations: readonly PluginRegistration[],
): void => {
  for (const phaseName of SINGLE_PROVIDER_PHASE_NAMES) {
    const providerNamesByScope = new Map<string, string[]>();

    for (const { plugin, scopes } of pluginRegistrations) {
      if (typeof plugin[phaseName] !== "function") {
        continue;
      }

      for (const scopeName of scopes) {
        providerNamesByScope.set(scopeName, [
          ...(providerNamesByScope.get(scopeName) ?? []),
          plugin.name,
        ]);
      }
    }

    for (const [scopeName, providerNames] of providerNamesByScope) {
      if (providerNames.length > 1) {
        throw new CoreConflictingPhaseProvidersError(phaseName, scopeName, providerNames);
      }
    }
  }
};

export const hasChanges = (changes: ScopeChangesMap): boolean => {
  return [...changes.values()].some((scopeChanges) => scopeChanges.length > 0);
};

export const assertStableNextVersions = (
  previousNextVersions: ScopeVersionMap,
  nextVersions: ScopeVersionMap,
): void => {
  for (const [scopeName, { version: previousVersion }] of previousNextVersions) {
    if (nextVersions.get(scopeName)?.version !== previousVersion) {
      throw new CoreUnstableNextVersionError(scopeName, previousVersion);
    }
  }
};

export const hasNewScopes = (
  previousNextVersions: ScopeVersionMap,
  nextVersions: ScopeVersionMap,
): boolean => {
  return [...nextVersions.keys()].some((scopeName) => !previousNextVersions.has(scopeName));
};

export const resolveCurrentVersions = (
  currentVersions: ScopeVersionMap,
  versionMetas: ScopeVersionMetaMap,
): ScopeVersionMap => {
  return new Map(
    [...currentVersions].map(([scopeName, currentVersion]) => [
      scopeName,
      {
        version: currentVersion.version,
        meta: { ...currentVersion.meta, ...versionMetas.get(scopeName) },
      },
    ]),
  );
};

export const resolveFileOperations = (
  cwd: string,
  fileOperations: ScopeFileOperationsMap,
): ScopeFileOperationsMap => {
  return new Map(
    [...fileOperations].map(([scopeName, scopeFileOperations]) => [
      scopeName,
      scopeFileOperations.map((fileOperation) => {
        if (fileOperation.path.trim().length === 0) {
          throw new CoreEmptyFileOperationPathError(scopeName, fileOperation.type);
        }

        return { ...fileOperation, path: resolve(cwd, fileOperation.path) };
      }),
    ]),
  );
};

export const dedupeFileOperations = (fileOperations: ScopeFileOperationsMap): FileOperation[] => {
  const fileOperationsByPath = new Map<string, FileOperation>();

  for (const scopeFileOperations of fileOperations.values()) {
    for (const fileOperation of scopeFileOperations) {
      const existingFileOperation = fileOperationsByPath.get(fileOperation.path);

      if (existingFileOperation === undefined) {
        fileOperationsByPath.set(fileOperation.path, fileOperation);

        continue;
      }

      if (!thisMod.isSameFileOperation(existingFileOperation, fileOperation)) {
        throw new CoreConflictingFileOperationError(fileOperation.path);
      }
    }
  }

  return [...fileOperationsByPath.values()];
};

export const isSameFileOperation = (left: FileOperation, right: FileOperation): boolean => {
  if (left.action === "delete" || right.action === "delete") {
    return left.action === right.action;
  }

  return left.content === right.content;
};

export const filterPhaseState = <TState extends PhaseState>(
  state: TState,
  scopeNames: ReadonlySet<string>,
): TState => {
  return Object.fromEntries(
    Object.entries(state).map(([key, resultMap]) => [
      key,
      filterScopeResultMap(resultMap, scopeNames),
    ]),
  ) as TState;
};

export const assertPhaseResultScopes = (
  phaseName: PhaseName,
  pluginName: string,
  result: unknown,
  scopeNames: ReadonlySet<string>,
): void => {
  if (DISCARDED_RESULT_PHASE_NAMES.has(phaseName)) {
    return;
  }

  if (!(result instanceof Map)) {
    return;
  }

  const unknownScopeName = [...result.keys()].find((scopeName) => !scopeNames.has(scopeName));

  if (unknownScopeName !== undefined) {
    throw new CoreUnknownPhaseResultScopeError(phaseName, pluginName, unknownScopeName);
  }
};
