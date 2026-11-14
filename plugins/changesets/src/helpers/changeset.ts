import type { FSReadResult } from "@unirelman/core";

import type { ParsedChangeset } from "../types";

import {
  ChangesetsInvalidFileError,
  ChangesetsInvalidScopesError,
  ChangesetsMissingFieldError,
  ChangesetsMissingFrontmatterError,
} from "../errors";
import * as thisMod from "./changeset";
import { parseLevel, parseScopes } from "./fields";

const WINDOWS_NEWLINE_REGEX = /\r\n/g;
const CHANGESET_DOCUMENT_REGEX = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export const parseChangesetFrontmatter = (frontmatterContent: string): Record<string, string> => {
  const frontmatterEntries = frontmatterContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex < 0) {
        return ["", ""] as const;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      return [key, value] as const;
    })
    .filter(([key]) => key.length > 0);

  return Object.fromEntries(frontmatterEntries);
};

export const parseChangeset = (content: string): ParsedChangeset => {
  const normalized = content.replace(WINDOWS_NEWLINE_REGEX, "\n");
  const match = normalized.match(CHANGESET_DOCUMENT_REGEX);

  if (!match) {
    throw new ChangesetsMissingFrontmatterError();
  }

  const [, rawFrontmatter, rawBody] = match;
  const frontmatter = thisMod.parseChangesetFrontmatter(rawFrontmatter);
  const scopes = parseScopes(frontmatter.scopes);
  const level = parseLevel(frontmatter.level);
  const message = rawBody.trim();

  if (scopes.length === 0) {
    throw new ChangesetsMissingFieldError("scopes");
  }

  if (level === undefined) {
    throw new ChangesetsMissingFieldError("level");
  }

  if (!message) {
    throw new ChangesetsMissingFieldError("message");
  }

  return { scopes, level, message };
};

export const assertKnownScopes = (
  scopeNames: readonly string[],
  knownScopeNames: readonly string[],
): void => {
  const unknownScopeNames = scopeNames.filter((scopeName) => !knownScopeNames.includes(scopeName));

  if (unknownScopeNames.length > 0) {
    throw new ChangesetsInvalidScopesError(unknownScopeNames, knownScopeNames);
  }
};

export const parseChangesetFile = (
  file: FSReadResult,
  knownScopeNames: readonly string[],
): ParsedChangeset => {
  try {
    const changeset = thisMod.parseChangeset(file.content);

    thisMod.assertKnownScopes(changeset.scopes, knownScopeNames);

    return changeset;
  } catch (error) {
    throw new ChangesetsInvalidFileError(file.path, error);
  }
};

export const serializeChangeset = (changeset: ParsedChangeset): string => {
  return `---\nscopes: ${changeset.scopes.join(",")}\nlevel: ${changeset.level}\n---\n\n${changeset.message}\n`;
};
