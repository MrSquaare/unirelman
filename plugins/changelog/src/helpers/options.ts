import type { ChangelogPluginOptions, ResolvedChangelogPluginOptions } from "../types";

import { DEFAULT_CHANGELOG_HEADER, DEFAULT_CHANGELOG_LEVEL_HEADERS } from "../constants";
import {
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogHeader,
  resolveScopeChangelogSectionHeader,
} from "./changelog";

export const resolveChangelogPluginOptions = (
  options: ChangelogPluginOptions = {},
): ResolvedChangelogPluginOptions => {
  const levelHeaders = { ...DEFAULT_CHANGELOG_LEVEL_HEADERS, ...options.levelHeaders };
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
