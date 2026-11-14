import type { Scope } from "@unirelman/core";

import { resolve } from "node:path";

import type { GitTagFormat } from "./types";

import * as thisMod from "./tag";

export const isRootScope = (scope: Scope, cwd: string): boolean => {
  return resolve(cwd, scope.path) === resolve(cwd);
};

export const resolveDefaultGitTag: GitTagFormat = ({ scopeName, version, isRootScope }) => {
  if (isRootScope) {
    return version;
  }

  return `${scopeName}@${version}`;
};

export const resolveGitTag = (
  scope: Scope,
  version: string,
  cwd: string,
  tagFormat: GitTagFormat,
): string => {
  return tagFormat({
    scopeName: scope.name,
    version,
    isRootScope: thisMod.isRootScope(scope, cwd),
  });
};
