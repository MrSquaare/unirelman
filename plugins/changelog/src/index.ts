import type { Plugin } from "@unirelman/core";

import type { ChangelogPluginOptions } from "./types";

import { resolveChangelogPluginOptions } from "./helpers/options";
import { createGenerateFileOperationsPhase } from "./phases/generate-file-operations";
import { createGetReleaseNotesPhase } from "./phases/get-release-notes";

export {
  ChangelogError,
  ChangelogInvalidHeaderError,
  ChangelogInvalidSectionHeaderError,
} from "./errors";
export type {
  ChangelogHeaderInput,
  ChangelogLevelHeaders,
  ChangelogMode,
  ChangelogNoChangeMessage,
  ChangelogPluginOptions,
  ChangelogScopeHeader,
  ChangelogSectionHeader,
  ChangelogSectionInput,
} from "./types";

export const createChangelogPlugin = (options: ChangelogPluginOptions = {}): Plugin => {
  const resolvedOptions = resolveChangelogPluginOptions(options);

  return {
    name: "changelog",
    generateFileOperations: createGenerateFileOperationsPhase(resolvedOptions),
    getReleaseNotes: createGetReleaseNotesPhase(resolvedOptions),
  };
};
