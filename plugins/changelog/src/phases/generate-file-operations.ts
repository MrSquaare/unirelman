import type {
  Change,
  ChangeLevel,
  FileOperation,
  Plugin,
  ScopeChangesMap,
  ScopeFileOperationsMap,
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

const LINE_BREAK_PATTERN = /\r?\n/;
const LIST_ITEM_INDENT = "  ";

export const resolveGroupedChangeMessages = (
  changes: readonly Change[] | undefined,
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

export const resolveChangeEntry = (message: string): string => {
  const [firstLine, ...continuationLines] = message.split(LINE_BREAK_PATTERN);

  return [
    `- ${firstLine}`,
    ...continuationLines.map((line) => (line.length === 0 ? line : `${LIST_ITEM_INDENT}${line}`)),
  ].join("\n");
};

export const resolveEmptyChangelogMarkdown = (noChangeMessage: string): string => {
  return `### ${CHANGELOG_EMPTY_HEADING}\n\n${thisMod.resolveChangeEntry(noChangeMessage)}`;
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

    const entries = messages.map((message) => thisMod.resolveChangeEntry(message));

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
  changes: readonly Change[] | undefined,
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
  nextVersions: ScopeVersionMap,
  changes: ScopeChangesMap,
  options: ResolvedChangelogPluginOptions,
): string => {
  const sections: string[] = [];
  const sortedNextVersions = [...nextVersions].sort(
    ([left], [right]) => Number(left > right) - Number(left < right),
  );

  for (const [scopeName, { version }] of sortedNextVersions) {
    sections.push(
      thisMod.resolveScopeChangelogMarkdown(scopeName, version, changes.get(scopeName), options),
    );
  }

  return sections.join("\n\n");
};

export const resolveNextChangelogContent = (
  sectionsMarkdown: string,
  existingContent: string,
  header: string,
): string => {
  const lines = existingContent.split(LINE_BREAK_PATTERN);
  const firstSectionIndex = lines.findIndex((line) => isChangelogSectionHeading(line));
  const existingSections =
    firstSectionIndex === -1 ? "" : lines.slice(firstSectionIndex).join("\n");

  return `${[header, sectionsMarkdown, existingSections]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n")}\n`;
};

export type ScopeChangelog = {
  readonly version: string;
  readonly path: string;
  readonly content: string;
};

export const resolveChangelogFileOperations = (
  nextVersions: ScopeVersionMap,
  changes: ScopeChangesMap,
  options: ResolvedChangelogPluginOptions,
  changelogs: ReadonlyMap<string, ScopeChangelog>,
): ScopeFileOperationsMap => {
  const fileOperations = new Map<string, FileOperation[]>();
  const rootMarkdown =
    options.mode === "root"
      ? thisMod.resolveRootChangelogMarkdown(nextVersions, changes, options)
      : undefined;

  for (const [scopeName, changelog] of changelogs) {
    const changelogMarkdown =
      rootMarkdown ??
      thisMod.resolveScopeChangelogMarkdown(
        scopeName,
        changelog.version,
        changes.get(scopeName),
        options,
      );

    fileOperations.set(scopeName, [
      {
        type: CHANGELOG_FILE_TYPE,
        path: changelog.path,
        action: "write",
        content: thisMod.resolveNextChangelogContent(
          changelogMarkdown,
          changelog.content,
          resolveChangelogHeader(options.header, scopeName),
        ),
        meta: {},
      },
    ]);
  }

  return fileOperations;
};

export const createGenerateFileOperationsPhase = (
  options: ResolvedChangelogPluginOptions,
): NonNullable<Plugin["generateFileOperations"]> => {
  return async (context, state): Promise<ScopeFileOperationsMap> => {
    const contents = new Map<string, string>();
    const changelogs = new Map<string, ScopeChangelog>();

    for (const [scopeName, scope] of context.scopes) {
      const nextVersion = state.nextVersions.get(scopeName);

      if (nextVersion === undefined) {
        continue;
      }

      const path = resolveChangelogPath(context.cwd, scope.path, options.mode);
      const content = contents.get(path) ?? (await context.fs.read(path, ""));

      contents.set(path, content);
      changelogs.set(scopeName, { version: nextVersion.version, path, content });
    }

    return thisMod.resolveChangelogFileOperations(
      state.nextVersions,
      state.changes,
      options,
      changelogs,
    );
  };
};
