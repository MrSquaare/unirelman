import type { Plugin, ScopeFileOperationsMap } from "@unirelman/core";

import type {
  ReplaceInput,
  ReplaceSearch,
  ResolvedReplaceFile,
  ResolvedReplacePluginOptions,
} from "../types";

import { REPLACE_FILE_TYPE } from "../constants";
import { ReplaceNoMatchError, ReplaceUnknownScopeError } from "../errors";
import * as thisMod from "./generate-file-operations";

export type ReplacedFile = {
  readonly content: string;
  readonly scopeNames: ReadonlySet<string>;
};

export const resolveReplaceRegExp = (search: ReplaceSearch, input: ReplaceInput): RegExp => {
  if (search instanceof RegExp) {
    return search;
  }

  return search(input);
};

export const resolveGlobalRegExp = (search: RegExp): RegExp => {
  if (search.global) {
    return search;
  }

  return new RegExp(search.source, `${search.flags}g`);
};

export const resolveReplacedContent = (
  content: string,
  file: ResolvedReplaceFile,
  input: ReplaceInput,
): string | undefined => {
  const search = thisMod.resolveReplaceRegExp(file.search, input);
  const hasMatch = content.search(search) !== -1;

  if (!hasMatch && !file.allowNoMatch) {
    throw new ReplaceNoMatchError(file.path, search);
  }

  if (!hasMatch) {
    return undefined;
  }

  return content.replace(thisMod.resolveGlobalRegExp(search), () => file.replace(input));
};

export const resolveReplaceFileOperations = (
  replacedFiles: ReadonlyMap<string, ReplacedFile>,
): ScopeFileOperationsMap => {
  const fileOperations: ScopeFileOperationsMap = {};

  for (const [path, replacedFile] of replacedFiles) {
    for (const scopeName of replacedFile.scopeNames) {
      fileOperations[scopeName] = [
        ...(fileOperations[scopeName] ?? []),
        { type: REPLACE_FILE_TYPE, path, action: "write", content: replacedFile.content, meta: {} },
      ];
    }
  }

  return fileOperations;
};

export const createGenerateFileOperationsPhase = (
  options: ResolvedReplacePluginOptions,
): NonNullable<Plugin["generateFileOperations"]> => {
  return async (context, state): Promise<ScopeFileOperationsMap> => {
    const replacedFiles = new Map<string, ReplacedFile>();

    for (const file of options.files) {
      if (!Object.hasOwn(context.scopes, file.scope)) {
        throw new ReplaceUnknownScopeError(file.path, file.scope);
      }

      const nextVersion = state.nextVersions[file.scope];

      if (nextVersion === undefined) {
        continue;
      }

      const replacedFile = replacedFiles.get(file.path);
      const content = replacedFile?.content ?? (await context.fs.read(file.path));
      const replacedContent = thisMod.resolveReplacedContent(content, file, {
        scopeName: file.scope,
        currentVersion: state.currentVersions[file.scope]?.version,
        nextVersion: nextVersion.version,
      });

      if (replacedContent === undefined) {
        continue;
      }

      replacedFiles.set(file.path, {
        content: replacedContent,
        scopeNames: new Set([...(replacedFile?.scopeNames ?? []), file.scope]),
      });
    }

    return thisMod.resolveReplaceFileOperations(replacedFiles);
  };
};
