import type {
  ChangeLevel,
  Plugin,
  ScopeChangesMap,
  ScopeFileOperationsMap,
  ScopeMap,
  ScopeVersionMap,
} from "@unirelman/core";

import type { ChangelogLevelHeaders, ResolvedChangelogPluginOptions } from "../types";

import { CHANGELOG_EMPTY_HEADING, CHANGELOG_FILE_TYPE, CHANGELOG_LEVELS } from "../constants";
import {
  isChangelogSectionHeading,
  resolveChangelogHeader,
  resolveChangelogPath,
  resolveChangelogSectionHeading,
} from "../helpers/changelog";
import * as thisMod from "./generate-file-operations";

export const resolveGroupedChangeMessages = (
  changes: ScopeChangesMap[string] | undefined,
): Record<ChangeLevel, string[]> => {
  const groupedChanges: Record<ChangeLevel, string[]> = {
    major: [],
    minor: [],
    patch: [],
  };

  if (!changes || changes.length === 0) {
    return groupedChanges;
  }

  for (const change of changes) {
    groupedChanges[change.level].push(change.message);
  }

  return groupedChanges;
};

export const resolveEmptyChangelogMarkdown = (noChangeMessage: string): string => {
  return `### ${CHANGELOG_EMPTY_HEADING}\n\n- ${noChangeMessage}`;
};

export const resolveChangelogGroupsMarkdown = (
  groupedChanges: Record<ChangeLevel, string[]>,
  levelHeaders: ChangelogLevelHeaders,
  noChangeMessage: string,
): string => {
  const sections: string[] = [];

  for (const level of CHANGELOG_LEVELS) {
    const messages = groupedChanges[level];

    if (messages.length === 0) {
      continue;
    }

    const entries = messages.map((message) => `- ${message}`);

    sections.push([`### ${levelHeaders[level]}`, "", ...entries].join("\n"));
  }

  if (sections.length === 0) {
    return thisMod.resolveEmptyChangelogMarkdown(noChangeMessage);
  }

  return sections.join("\n\n");
};

export const resolveScopeChangelogMarkdown = (
  scopeName: string,
  version: string,
  changes: ScopeChangesMap[string] | undefined,
  options: ResolvedChangelogPluginOptions,
): string => {
  const sectionHeading = resolveChangelogSectionHeading(options.sectionHeader, scopeName, version);
  const groupedChanges = thisMod.resolveGroupedChangeMessages(changes);
  const groups = thisMod.resolveChangelogGroupsMarkdown(
    groupedChanges,
    options.levelHeaders,
    options.noChangeMessage({ scopeName, version }),
  );

  return [sectionHeading, groups].join("\n\n");
};

export const resolveRootChangelogMarkdown = (
  scopes: ScopeMap,
  nextVersions: ScopeVersionMap,
  changes: ScopeChangesMap,
  options: ResolvedChangelogPluginOptions,
): string => {
  const sections: string[] = [];
  const scopeNames = Object.keys(nextVersions).sort();

  for (const scopeName of scopeNames) {
    const version = nextVersions[scopeName]?.version;

    if (!scopes[scopeName] || !version) {
      continue;
    }

    sections.push(
      thisMod.resolveScopeChangelogMarkdown(scopeName, version, changes[scopeName], options),
    );
  }

  return sections.join("\n\n");
};

export const resolveNextChangelogContent = (
  sectionsMarkdown: string,
  existingContent: string,
  header: string,
): string => {
  const lines = existingContent.split("\n");
  const firstSectionIndex = lines.findIndex((line) => isChangelogSectionHeading(line));
  const existingSections =
    firstSectionIndex === -1 ? "" : lines.slice(firstSectionIndex).join("\n");

  return `${[header, sectionsMarkdown, existingSections]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n")}\n`;
};

export const resolveChangelogFileOperations = (
  cwd: string,
  scopes: ScopeMap,
  nextVersions: ScopeVersionMap,
  changes: ScopeChangesMap,
  options: ResolvedChangelogPluginOptions,
  existingContents: Record<string, string>,
): ScopeFileOperationsMap => {
  const fileOperations: ScopeFileOperationsMap = {};
  const rootMarkdown =
    options.mode === "root"
      ? thisMod.resolveRootChangelogMarkdown(scopes, nextVersions, changes, options)
      : undefined;

  for (const scopeName in nextVersions) {
    const scope = scopes[scopeName];
    const version = nextVersions[scopeName]?.version;

    if (!scope || !version) {
      continue;
    }

    const filePath = resolveChangelogPath(cwd, scope.path, options.mode);
    const changelogMarkdown =
      rootMarkdown ??
      thisMod.resolveScopeChangelogMarkdown(scopeName, version, changes[scopeName], options);

    fileOperations[scopeName] = [
      {
        type: CHANGELOG_FILE_TYPE,
        path: filePath,
        action: "write",
        content: thisMod.resolveNextChangelogContent(
          changelogMarkdown,
          existingContents[filePath],
          resolveChangelogHeader(options.header, scopeName),
        ),
        meta: {},
      },
    ];
  }

  return fileOperations;
};

export const createGenerateFileOperationsPhase = (
  options: ResolvedChangelogPluginOptions,
): NonNullable<Plugin["generateFileOperations"]> => {
  return async (context, state): Promise<ScopeFileOperationsMap> => {
    const existingContents: Record<string, string> = {};

    for (const scopeName in state.nextVersions) {
      const scope = context.scopes[scopeName];

      if (!scope || !state.nextVersions[scopeName]?.version) {
        continue;
      }

      const filePath = resolveChangelogPath(context.cwd, scope.path, options.mode);

      if (filePath in existingContents) {
        continue;
      }

      existingContents[filePath] = await context.fs.read(filePath, "");
    }

    return thisMod.resolveChangelogFileOperations(
      context.cwd,
      context.scopes,
      state.nextVersions,
      state.changes,
      options,
      existingContents,
    );
  };
};
