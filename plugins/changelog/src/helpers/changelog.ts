import { resolve } from "node:path";

import type {
  ChangelogHeaderInput,
  ChangelogMode,
  ChangelogScopeHeader,
  ChangelogSectionHeader,
  ChangelogSectionInput,
} from "../types";

import { CHANGELOG_FILE_NAME, DEFAULT_CHANGELOG_NO_CHANGE_MESSAGE } from "../constants";
import { ChangelogInvalidHeaderError, ChangelogInvalidSectionHeaderError } from "../errors";
import * as thisMod from "./changelog";

const SECTION_HEADING_PREFIX = "## ";

export const resolveChangelogPath = (
  cwd: string,
  scopePath: string,
  mode: ChangelogMode,
): string => {
  if (mode === "root") {
    return resolve(cwd, CHANGELOG_FILE_NAME);
  }

  return resolve(scopePath, CHANGELOG_FILE_NAME);
};

export const isChangelogSectionHeading = (line: string): boolean => {
  return line.startsWith(SECTION_HEADING_PREFIX);
};

export const resolveRootChangelogSectionHeader = ({
  scopeName,
  version,
}: ChangelogSectionInput): string => {
  return `${SECTION_HEADING_PREFIX}${scopeName} - ${version}`;
};

export const resolveScopeChangelogSectionHeader = ({ version }: ChangelogSectionInput): string => {
  return `${SECTION_HEADING_PREFIX}${version}`;
};

export const resolveScopeChangelogHeader = ({ scopeName }: ChangelogHeaderInput): string => {
  return `# ${scopeName} Changelog`;
};

export const resolveDefaultChangelogNoChangeMessage = (): string => {
  return DEFAULT_CHANGELOG_NO_CHANGE_MESSAGE;
};

export const resolveChangelogSectionHeading = (
  sectionHeader: ChangelogSectionHeader,
  scopeName: string,
  version: string,
): string => {
  const heading = sectionHeader({ scopeName, version });

  if (heading.includes("\n") || !thisMod.isChangelogSectionHeading(heading)) {
    throw new ChangelogInvalidSectionHeaderError(heading);
  }

  return heading;
};

export const resolveChangelogHeader = (header: ChangelogScopeHeader, scopeName: string): string => {
  const text = typeof header === "string" ? header : header({ scopeName });

  if (text.split("\n").some((line) => thisMod.isChangelogSectionHeading(line))) {
    throw new ChangelogInvalidHeaderError(text);
  }

  return text;
};
