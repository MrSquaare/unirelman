import type { Group } from "./types";

export const resolveGroupLabel = (group: Group): string => {
  return `group ${group.name} (${group.scopes.join(", ")})`;
};
