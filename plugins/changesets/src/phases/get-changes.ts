import type { Change, Plugin, ScopeChangesMap } from "@unirelman/core";

import { CHANGESET_FILE_EXTENSION } from "../constants";
import { parseChangesetFile } from "../helpers/changeset";

export const runGetChangesPhase: NonNullable<Plugin["getChanges"]> = async (
  context,
): Promise<ScopeChangesMap> => {
  const files = await context.store.readAll();
  const knownScopeNames = [...context.scopes.keys()];
  const changes = new Map<string, Change[]>();

  for (const file of files) {
    if (!file.path.endsWith(CHANGESET_FILE_EXTENSION)) {
      continue;
    }

    const changeset = parseChangesetFile(file, knownScopeNames);

    for (const scopeName of changeset.scopes) {
      changes.set(scopeName, [
        ...(changes.get(scopeName) ?? []),
        {
          message: changeset.message,
          level: changeset.level,
          meta: { changesets: { path: file.path } },
        },
      ]);
    }
  }

  return changes;
};
