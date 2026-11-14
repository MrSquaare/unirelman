import type { ChangelogPluginOptions, ResolvedChangelogPluginOptions } from "../types";

import { DEFAULT_CHANGELOG_HEADER, DEFAULT_CHANGELOG_LEVEL_HEADERS } from "../constants";
import { ChangelogInvalidLevelHeaderError } from "../errors";
import {
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogHeader,
  resolveScopeChangelogSectionHeader,
} from "./changelog";

const LINE_BREAK_PATTERN = /[\r\n]/;

export const resolveChangelogPluginOptions = (
  options: ChangelogPluginOptions = {},
): ResolvedChangelogPluginOptions => {
  const levelHeaders = { ...DEFAULT_CHANGELOG_LEVEL_HEADERS, ...options.levelHeaders };
  const invalidLevelHeader = Object.entries(levelHeaders).find(([, levelHeader]) =>
    LINE_BREAK_PATTERN.test(levelHeader),
  );

  if (invalidLevelHeader !== undefined) {
    throw new ChangelogInvalidLevelHeaderError(...invalidLevelHeader);
  }

  const noChangeMessage = options.noChangeMessage ?? resolveDefaultChangelogNoChangeMessage;

  if (options.mode === "scope") {
    return {
      mode: "scope",
      header: options.header ?? resolveScopeChangelogHeader,
      sectionHeader: options.sectionHeader ?? resolveScopeChangelogSectionHeader,
      levelHeaders,
      noChangeMessage,
    };
  }

  return {
    mode: "root",
    header: options.header ?? DEFAULT_CHANGELOG_HEADER,
    sectionHeader: options.sectionHeader ?? resolveRootChangelogSectionHeader,
    levelHeaders,
    noChangeMessage,
  };
};
