import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import {
  type Change,
  type ComputeNextVersionState,
  type FileDelete,
  type GenerateFileOperationsState,
  type GetChangesState,
  type GetDependencyChangesState,
  type PhaseContext,
  type PrepareState,
  type CreateReleasesState,
  type FinalizeState,
  type Release,
  type ScopeReleaseNotesMap,
  type ScopeReleasesMap,
  type ScopeChangesMap,
  type ScopeFileOperationsMap,
  type ScopeVersionMap,
  type Version,
  type FileWrite,
} from "../../types/phases";
import { MockFS } from "../mocks/fs";
import { MockLogger } from "../mocks/logger";
import { MockStore } from "../mocks/store";
import { CONFIG_CWD, SCOPE_NAMES, SCOPE_PATHS, VERSIONS } from "./constants";
import { createScopeMap } from "./scope";

export const createVersion = defineObjectGenerator<Version>(() => ({
  version: VERSIONS.DEFAULT,
  meta: {},
}));

export const createChange = defineObjectGenerator<Change>(() => ({
  message: "test change",
  level: "patch",
  meta: {},
}));

export const createFileWrite = defineObjectGenerator<FileWrite>(() => ({
  type: "changelog",
  path: `${CONFIG_CWD}/CHANGELOG.md`,
  action: "write",
  content: "# Changelog\n",
  meta: {},
}));

export const createFileDelete = defineObjectGenerator<FileDelete>(() => ({
  type: "changeset",
  path: `${CONFIG_CWD}/.unirelman/changesets/changeset.md`,
  action: "delete",
  meta: {},
}));

export const createRelease = defineObjectGenerator<Release>(() => ({
  type: "git-tag",
  name: `${SCOPE_NAMES.ALPHA}@${VERSIONS.DEFAULT}`,
  status: "created",
  meta: {},
}));

export const createScopeVersionMap = defineObjectGenerator<ScopeVersionMap>(() => ({
  [SCOPE_NAMES.ALPHA]: createVersion(),
  [SCOPE_NAMES.BETA]: createVersion({ extends: { version: VERSIONS.MAJOR } }),
}));

export const createScopeChangesMap = defineObjectGenerator<ScopeChangesMap>(() => ({
  [SCOPE_NAMES.ALPHA]: [
    createChange({ extends: { message: "drop Node 18 support", level: "major" } }),
    createChange({ extends: { message: "add release notes command", level: "minor" } }),
    createChange({ extends: { message: "fix changelog heading typo", level: "patch" } }),
  ],
  [SCOPE_NAMES.BETA]: [
    createChange({ extends: { message: "add changelog phase wiring", level: "minor" } }),
  ],
}));

export const createScopeFileOperationsMap = defineObjectGenerator<ScopeFileOperationsMap>(() => ({
  [SCOPE_NAMES.ALPHA]: [
    createFileWrite({
      extends: {
        type: "changelog",
        path: `${SCOPE_PATHS[SCOPE_NAMES.ALPHA]}/CHANGELOG.md`,
      },
    }),
  ],
  [SCOPE_NAMES.BETA]: [
    createFileWrite({
      extends: {
        type: "changelog",
        path: `${SCOPE_PATHS[SCOPE_NAMES.BETA]}/CHANGELOG.md`,
      },
    }),
  ],
}));

export const createScopeReleaseNotesMap = defineObjectGenerator<ScopeReleaseNotesMap>(() => ({
  [SCOPE_NAMES.ALPHA]: "### Patch changes\n- fix changelog heading typo",
  [SCOPE_NAMES.BETA]: "### Minor changes\n- add changelog phase wiring",
}));

export const createPhaseContext = defineObjectGenerator<PhaseContext>(() => ({
  cwd: CONFIG_CWD,
  dryRun: false,
  pipeline: "version",
  scopes: createScopeMap(),
  fs: new MockFS(CONFIG_CWD),
  store: new MockStore(CONFIG_CWD),
  logger: new MockLogger(),
}));

export const createGetChangesState = defineObjectGenerator<GetChangesState>(() => ({
  currentVersions: createScopeVersionMap(),
}));

export const createComputeNextVersionState = defineObjectGenerator<ComputeNextVersionState>(() => ({
  currentVersions: createScopeVersionMap(),
  changes: createScopeChangesMap(),
}));

export const createGetDependencyChangesState = defineObjectGenerator<GetDependencyChangesState>(
  () => ({
    currentVersions: createScopeVersionMap(),
    changes: createScopeChangesMap(),
    nextVersions: createScopeVersionMap(),
  }),
);

export const createGenerateFileOperationsState = defineObjectGenerator<GenerateFileOperationsState>(
  () => ({
    currentVersions: createScopeVersionMap(),
    changes: createScopeChangesMap(),
    nextVersions: createScopeVersionMap(),
  }),
);

export const createPrepareState = defineObjectGenerator<PrepareState>(() => ({
  currentVersions: createScopeVersionMap(),
  changes: createScopeChangesMap(),
  nextVersions: createScopeVersionMap(),
  fileOperations: createScopeFileOperationsMap(),
}));

export const createCreateReleasesState = defineObjectGenerator<CreateReleasesState>(() => ({
  currentVersions: createScopeVersionMap(),
  releaseNotes: createScopeReleaseNotesMap(),
}));

export const createScopeReleasesMap = defineObjectGenerator<ScopeReleasesMap>(() => ({
  [SCOPE_NAMES.ALPHA]: [createRelease()],
  [SCOPE_NAMES.BETA]: [
    createRelease({ extends: { name: `${SCOPE_NAMES.BETA}@${VERSIONS.MAJOR}` } }),
  ],
}));

export const createFinalizeState = defineObjectGenerator<FinalizeState>(() => ({
  currentVersions: createScopeVersionMap(),
  releaseNotes: createScopeReleaseNotesMap(),
  releases: createScopeReleasesMap(),
}));
