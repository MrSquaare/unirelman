import type { Plugin, ScopeReleaseNotesMap } from "@unirelman/core";

import type { ResolvedChangelogPluginOptions } from "../types";

import {
  isChangelogSectionHeading,
  resolveChangelogPath,
  resolveChangelogSectionHeading,
} from "../helpers/changelog";
import * as thisMod from "./get-release-notes";

const LINE_BREAK_PATTERN = /\r?\n/;
const CODE_FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;
const CLOSING_CODE_FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

export const resolveChangelogSection = (content: string, heading: string): string | undefined => {
  const lines = content.split(LINE_BREAK_PATTERN);
  const headingIndex = lines.indexOf(heading);

  if (headingIndex === -1) {
    return undefined;
  }

  const bodyLines: string[] = [];
  let openFence: string | undefined;

  for (const line of lines.slice(headingIndex + 1)) {
    if (openFence === undefined && isChangelogSectionHeading(line)) {
      break;
    }

    if (openFence === undefined) {
      openFence = CODE_FENCE_PATTERN.exec(line)?.[1];
    } else {
      const closingFence = CLOSING_CODE_FENCE_PATTERN.exec(line)?.[1];

      if (
        closingFence !== undefined &&
        closingFence[0] === openFence[0] &&
        closingFence.length >= openFence.length
      ) {
        openFence = undefined;
      }
    }

    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
};

export const createGetReleaseNotesPhase = (
  options: ResolvedChangelogPluginOptions,
): NonNullable<Plugin["getReleaseNotes"]> => {
  return async (context, state): Promise<ScopeReleaseNotesMap> => {
    const contents: Record<string, string> = {};
    const releaseNotes: ScopeReleaseNotesMap = {};

    for (const scopeName in state.currentVersions) {
      const scope = context.scopes[scopeName];
      const version = state.currentVersions[scopeName]?.version;

      if (!scope || !version) {
        continue;
      }

      const filePath = resolveChangelogPath(context.cwd, scope.path, options.mode);

      if (!(filePath in contents)) {
        contents[filePath] = await context.fs.read(filePath, "");
      }

      const section = thisMod.resolveChangelogSection(
        contents[filePath],
        resolveChangelogSectionHeading(options.sectionHeader, scopeName, version),
      );

      if (section === undefined) {
        continue;
      }

      releaseNotes[scopeName] = section;
    }

    return releaseNotes;
  };
};
