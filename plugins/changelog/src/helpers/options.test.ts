import { describe, expect, it } from "vitest";

import { ChangelogInvalidLevelHeaderError } from "../errors";
import {
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogHeader,
  resolveScopeChangelogSectionHeader,
} from "./changelog";
import { resolveChangelogPluginOptions } from "./options";

describe("resolveChangelogPluginOptions", () => {
  it("should resolve default options when no options are provided", () => {
    expect(resolveChangelogPluginOptions()).toEqual({
      mode: "root",
      header: "# Changelog",
      sectionHeader: resolveRootChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
  });

  it("should default the header and the section header to the scope in scope mode", () => {
    expect(resolveChangelogPluginOptions({ mode: "scope" })).toEqual({
      mode: "scope",
      header: resolveScopeChangelogHeader,
      sectionHeader: resolveScopeChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
  });

  it("should resolve the provided options, merging the level headers over the defaults", () => {
    const sectionHeader = () => "## release";
    const noChangeMessage = () => "Nothing changed.";

    expect(
      resolveChangelogPluginOptions({
        mode: "scope",
        header: "# History",
        sectionHeader,
        levelHeaders: { major: "Breaking" },
        noChangeMessage,
      }),
    ).toEqual({
      mode: "scope",
      header: "# History",
      sectionHeader,
      levelHeaders: { major: "Breaking", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage,
    });
  });

  it("should throw when a level header has a line break", () => {
    expect(() =>
      resolveChangelogPluginOptions({ levelHeaders: { patch: "Fixes\n## 1.0.0" } }),
    ).toThrow(new ChangelogInvalidLevelHeaderError("patch", "Fixes\n## 1.0.0"));
  });
});
