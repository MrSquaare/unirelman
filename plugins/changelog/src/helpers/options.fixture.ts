import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { ResolvedChangelogPluginOptions } from "../types";

import {
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
} from "./changelog";

export const createResolvedChangelogPluginOptions =
  defineObjectGenerator<ResolvedChangelogPluginOptions>(() => ({
    mode: "root",
    header: "# Changelog",
    sectionHeader: resolveRootChangelogSectionHeader,
    levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
    noChangeMessage: resolveDefaultChangelogNoChangeMessage,
  }));
