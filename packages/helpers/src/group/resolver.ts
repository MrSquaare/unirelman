import type { Group, GroupRecord } from "./types";

import { ALL_SCOPES_GROUP_NAME } from "./constants";
import { GroupDuplicateScopeError, GroupEmptyError, GroupUnknownScopeError } from "./errors";

export const resolveGroups = (
  groups: boolean | GroupRecord,
  scopeNames: readonly string[],
): Group[] => {
  if (groups === true) {
    return [{ name: ALL_SCOPES_GROUP_NAME, scopes: [...scopeNames] }];
  }

  if (groups === false) {
    return [];
  }

  const groupedScopeNames = new Set<string>();

  return Object.entries(groups).map(([name, scopes]) => {
    if (scopes.length === 0) {
      throw new GroupEmptyError(name);
    }

    for (const scopeName of scopes) {
      if (!scopeNames.includes(scopeName)) {
        throw new GroupUnknownScopeError(name, scopeName, scopeNames);
      }

      if (groupedScopeNames.has(scopeName)) {
        throw new GroupDuplicateScopeError(scopeName);
      }

      groupedScopeNames.add(scopeName);
    }

    return { name, scopes: [...scopes] };
  });
};
