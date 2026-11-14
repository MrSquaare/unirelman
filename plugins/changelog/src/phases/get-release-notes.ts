import type { Plugin, ScopeReleaseNotesMap } from "@unirelman/core";

import type { ResolvedChangelogPluginOptions } from "../types";

import {
  isChangelogSectionHeading,
  resolveChangelogPath,
  resolveChangelogSectionHeading,
} from "../helpers/changelog";
import * as thisMod from "./get-release-notes";

const CODE_FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

export const resolveChangelogSection = (content: string, heading: string): string | undefined => {
  const lines = content.split("\n");
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

    const fence = CODE_FENCE_PATTERN.exec(line)?.[1];

    if (fence !== undefined && openFence === undefined) {
      openFence = fence;
    } else if (
      fence !== undefined &&
      openFence !== undefined &&
      fence[0] === openFence[0] &&
      fence.length >= openFence.length
    ) {
      openFence = undefined;
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
