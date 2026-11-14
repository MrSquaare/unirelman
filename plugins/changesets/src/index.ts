import type { CLIPlugin } from "@unirelman/cli";

import { randomUUID } from "node:crypto";

import type { ChangesetsChangeMeta } from "./types";

import { createCreateCommand } from "./commands/create";
import { CHANGESETS_PLUGIN_NAME } from "./constants";
import { runGenerateFileOperationsPhase } from "./phases/generate-file-operations";
import { runGetChangesPhase } from "./phases/get-changes";

export { isChangesetsChangeMeta } from "./helpers/guard";
export {
  ChangesetsError,
  ChangesetsInvalidFileError,
  ChangesetsInvalidLevelError,
  ChangesetsInvalidScopesError,
  ChangesetsMissingFieldError,
  ChangesetsMissingFrontmatterError,
} from "./errors";

export { changesetsCreateOutputSchema } from "./types";

export type {
  Changeset,
  ChangesetField,
  ChangesetsChangeMeta,
  ChangesetsCreateOutput,
} from "./types";

declare module "@unirelman/core" {
  interface ChangeMeta extends ChangesetsChangeMeta {}
}

export const createChangesetsPlugin = (): CLIPlugin => {
  return {
    name: CHANGESETS_PLUGIN_NAME,
    commandDescription: "Manage changesets",
    commands: (context) => ({
      create: createCreateCommand(context, Date.now, randomUUID),
    }),
    getChanges: runGetChangesPhase,
    generateFileOperations: runGenerateFileOperationsPhase,
  };
};
