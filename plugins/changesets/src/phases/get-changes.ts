import type { Plugin, ScopeChangesMap } from "@unirelman/core";

import { CHANGESET_FILE_EXTENSION } from "../constants";
import { parseChangesetFile } from "../helpers/changeset";

export const runGetChangesPhase: NonNullable<Plugin["getChanges"]> = async (
  context,
): Promise<ScopeChangesMap> => {
  const files = await context.store.readAll();
  const knownScopeNames = Object.keys(context.scopes);
  const changes: ScopeChangesMap = {};

  for (const file of files) {
    if (!file.path.endsWith(CHANGESET_FILE_EXTENSION)) {
      continue;
    }

    const changeset = parseChangesetFile(file, knownScopeNames);

    for (const scopeName of changeset.scopes) {
      changes[scopeName] = [
        ...(changes[scopeName] ?? []),
        {
          message: changeset.message,
          level: changeset.level,
          meta: { changesets: { path: file.path } },
        },
      ];
    }
  }

  return changes;
};
