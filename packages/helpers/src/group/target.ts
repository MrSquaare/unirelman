import type { Group, GroupTarget } from "./types";

import { resolveGroupLabel } from "./label";

export const resolveIndependentScopes = (
  groups: readonly Group[],
  scopeNames: readonly string[],
): string[] => {
  const groupedScopes = new Set(groups.flatMap((group) => group.scopes));

  return scopeNames.filter((scopeName) => !groupedScopes.has(scopeName));
};

export const resolveGroupTargets = (
  groups: readonly Group[],
  independentScopes: readonly string[],
): GroupTarget[] => {
  return [
    ...groups.map((group) => ({ group: group.name, scopes: group.scopes })),
    ...independentScopes.map((scopeName) => ({ group: undefined, scopes: [scopeName] })),
  ];
};

export const resolveGroupTargetLabel = (target: GroupTarget): string => {
  return target.group === undefined
    ? `scope ${target.scopes.join(", ")}`
    : resolveGroupLabel({ name: target.group, scopes: target.scopes });
};
