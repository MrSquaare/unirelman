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
    const contents = new Map<string, string>();
    const releaseNotes = new Map<string, string>();

    for (const [scopeName, scope] of context.scopes) {
      const currentVersion = state.currentVersions.get(scopeName);

      if (currentVersion === undefined) {
        continue;
      }

      const filePath = resolveChangelogPath(context.cwd, scope.path, options.mode);
      const content = contents.get(filePath) ?? (await context.fs.read(filePath, ""));

      contents.set(filePath, content);

      const section = thisMod.resolveChangelogSection(
        content,
        resolveChangelogSectionHeading(options.sectionHeader, scopeName, currentVersion.version),
      );

      if (section === undefined) {
        continue;
      }

      releaseNotes.set(scopeName, section);
    }

    return releaseNotes;
  };
};
