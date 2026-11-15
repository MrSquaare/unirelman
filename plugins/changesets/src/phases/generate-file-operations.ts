import type { FileOperation, Plugin, ScopeFileOperationsMap } from "@unirelman/core";

import { CHANGESET_FILE_TYPE } from "../constants";
import { isChangesetsChangeMeta } from "../helpers/guard";

export const runGenerateFileOperationsPhase: NonNullable<Plugin["generateFileOperations"]> = async (
  context,
  state,
): Promise<ScopeFileOperationsMap> => {
  const fileOperations = new Map<string, FileOperation[]>();

  for (const [scopeName, changes] of state.changes) {
    for (const change of changes) {
      if (!isChangesetsChangeMeta(change.meta)) {
        continue;
      }

      fileOperations.set(scopeName, [
        ...(fileOperations.get(scopeName) ?? []),
        {
          type: CHANGESET_FILE_TYPE,
          path: context.store.resolvePath(change.meta.changesets.path),
          action: "delete",
          meta: {},
        },
      ]);
    }
  }

  return fileOperations;
};
