import { mockedResolveChangelogPluginOptions } from "./helpers/options.mock";
import { mockedCreateGenerateFileOperationsPhase } from "./phases/generate-file-operations.mock";
import { mockedCreateGetReleaseNotesPhase } from "./phases/get-release-notes.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogHeader,
  resolveScopeChangelogSectionHeader,
} from "./helpers/changelog";
import { createChangelogPlugin } from "./index";

describe("createChangelogPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create expected plugin shape", () => {
    const mockPhase = vi.fn();
    const mockGetReleaseNotesPhase = vi.fn();

    mockedCreateGenerateFileOperationsPhase.mockReturnValueOnce(mockPhase);
    mockedCreateGetReleaseNotesPhase.mockReturnValueOnce(mockGetReleaseNotesPhase);

    const plugin = createChangelogPlugin();

    expect(plugin).toEqual({
      name: "changelog",
      generateFileOperations: mockPhase,
      getReleaseNotes: mockGetReleaseNotesPhase,
    });
    expect(mockedResolveChangelogPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveChangelogPluginOptions).toHaveBeenNthCalledWith(1, {});
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenNthCalledWith(1, {
      mode: "root",
      header: "# Changelog",
      sectionHeader: resolveRootChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
    expect(mockedCreateGetReleaseNotesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGetReleaseNotesPhase).toHaveBeenNthCalledWith(1, {
      mode: "root",
      header: "# Changelog",
      sectionHeader: resolveRootChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
  });

  it("should pass resolved options to phase handlers when options are provided", () => {
    const options = { mode: "scope" as const };
    const mockPhase = vi.fn();
    const mockGetReleaseNotesPhase = vi.fn();

    mockedCreateGenerateFileOperationsPhase.mockReturnValueOnce(mockPhase);
    mockedCreateGetReleaseNotesPhase.mockReturnValueOnce(mockGetReleaseNotesPhase);

    const plugin = createChangelogPlugin(options);

    expect(plugin).toEqual({
      name: "changelog",
      generateFileOperations: mockPhase,
      getReleaseNotes: mockGetReleaseNotesPhase,
    });
    expect(mockedResolveChangelogPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveChangelogPluginOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenNthCalledWith(1, {
      mode: "scope",
      header: resolveScopeChangelogHeader,
      sectionHeader: resolveScopeChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
    expect(mockedCreateGetReleaseNotesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGetReleaseNotesPhase).toHaveBeenNthCalledWith(1, {
      mode: "scope",
      header: resolveScopeChangelogHeader,
      sectionHeader: resolveScopeChangelogSectionHeader,
      levelHeaders: { major: "Major changes", minor: "Minor changes", patch: "Patch changes" },
      noChangeMessage: resolveDefaultChangelogNoChangeMessage,
    });
  });
});
