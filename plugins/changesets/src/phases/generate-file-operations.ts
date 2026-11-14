import type { Plugin, ScopeFileOperationsMap } from "@unirelman/core";

import { CHANGESET_FILE_TYPE } from "../constants";
import { isChangesetsChangeMeta } from "../helpers/guard";

export const runGenerateFileOperationsPhase: NonNullable<Plugin["generateFileOperations"]> = async (
  context,
  state,
): Promise<ScopeFileOperationsMap> => {
  const fileOperations: ScopeFileOperationsMap = {};

  for (const scopeName in state.changes) {
    for (const change of state.changes[scopeName]) {
      if (!isChangesetsChangeMeta(change.meta)) {
        continue;
      }

      fileOperations[scopeName] = [
        ...(fileOperations[scopeName] ?? []),
        {
          type: CHANGESET_FILE_TYPE,
          path: context.store.resolvePath(change.meta.changesets.path),
          action: "delete",
          meta: {},
        },
      ];
    }
  }

  return fileOperations;
};
