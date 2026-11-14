import type { ChangeLevel } from "@unirelman/core";

export const CHANGELOG_FILE_NAME = "CHANGELOG.md";
export const CHANGELOG_FILE_TYPE = "changelog";
export const DEFAULT_CHANGELOG_HEADER = "# Changelog";
export const CHANGELOG_LEVELS = [
  "major",
  "minor",
  "patch",
] as const satisfies readonly ChangeLevel[];
export const DEFAULT_CHANGELOG_LEVEL_HEADERS = {
  major: "Major changes",
  minor: "Minor changes",
  patch: "Patch changes",
} as const satisfies Record<ChangeLevel, string>;
export const CHANGELOG_EMPTY_HEADING = "Changes";
export const DEFAULT_CHANGELOG_NO_CHANGE_MESSAGE = "No user-facing changes.";
