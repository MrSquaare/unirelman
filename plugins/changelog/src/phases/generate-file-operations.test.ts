import {
  mockedResolveChangelogHeader,
  mockedResolveChangelogPath,
  mockedResolveChangelogSectionHeading,
} from "../helpers/changelog.mock";

import type { Change } from "@unirelman/core";

import {
  CONFIG_CWD,
  createChange,
  createGenerateFileOperationsState,
  createPhaseContext,
  createScopeChangesMap,
  createScopeFileOperationsMap,
  createScopeMap,
  createScopeVersionMap,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createResolvedChangelogPluginOptions } from "../helpers/options.fixture";
import {
  createGenerateFileOperationsPhase,
  resolveChangeEntry,
  resolveChangelogGroupsMarkdown,
  resolveEmptyChangelogMarkdown,
  resolveChangelogFileOperations,
  resolveGroupedChangeMessages,
  resolveNextChangelogContent,
  resolveRootChangelogMarkdown,
  resolveScopeChangelogMarkdown,
} from "./generate-file-operations";
import * as thisMod from "./generate-file-operations";

const LEVEL_HEADERS = { major: "Breaking", minor: "Features", patch: "Fixes" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveGroupedChangeMessages", () => {
  it("should group changes by change level", () => {
    const changesMap = createScopeChangesMap();
    const alphaChanges = changesMap[SCOPE_NAMES.ALPHA];

    expect(resolveGroupedChangeMessages(alphaChanges)).toEqual({
      major: [alphaChanges[0].message],
      minor: [alphaChanges[1].message],
      patch: [alphaChanges[2].message],
    });
  });

  it("should return empty groups when changes are missing", () => {
    expect(resolveGroupedChangeMessages(undefined)).toEqual({
      major: [],
      minor: [],
      patch: [],
    });
  });
});

describe("resolveEmptyChangelogMarkdown", () => {
  it("should render the no-change subsection with the message", () => {
    expect(resolveEmptyChangelogMarkdown("Nothing changed.")).toEqual(
      "### Changes\n\n- Nothing changed.",
    );
  });
});

describe("resolveChangeEntry", () => {
  it("should render a single-line message as a list item", () => {
    expect(resolveChangeEntry("fix a bug")).toEqual("- fix a bug");
  });

  it("should indent the continuation lines of a multiline message under the list item", () => {
    expect(
      resolveChangeEntry("add a feature\n\nIt has a second paragraph.\n\n## Usage\n\nRun it."),
    ).toEqual("- add a feature\n\n  It has a second paragraph.\n\n  ## Usage\n\n  Run it.");
  });

  it("should split a multiline message with CRLF line endings", () => {
    expect(resolveChangeEntry("add a feature\r\n\r\nDetails.")).toEqual(
      "- add a feature\n\n  Details.",
    );
  });
});

describe("resolveChangelogGroupsMarkdown", () => {
  const resolveChangeEntrySpy = vi.spyOn(thisMod, "resolveChangeEntry");
  const resolveEmptyChangelogMarkdownSpy = vi.spyOn(thisMod, "resolveEmptyChangelogMarkdown");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render each level with changes under its header", () => {
    expect(
      resolveChangelogGroupsMarkdown(
        {
          major: ["drop Node 18 support"],
          minor: ["add release notes command"],
          patch: ["fix changelog heading typo"],
        },
        LEVEL_HEADERS,
        "Nothing changed.",
      ),
    ).toEqual(
      [
        "### Breaking",
        "",
        "- drop Node 18 support",
        "",
        "### Features",
        "",
        "- add release notes command",
        "",
        "### Fixes",
        "",
        "- fix changelog heading typo",
      ].join("\n"),
    );
    expect(resolveChangeEntrySpy).toHaveBeenCalledTimes(3);
    expect(resolveChangeEntrySpy).toHaveBeenNthCalledWith(1, "drop Node 18 support");
    expect(resolveChangeEntrySpy).toHaveBeenNthCalledWith(2, "add release notes command");
    expect(resolveChangeEntrySpy).toHaveBeenNthCalledWith(3, "fix changelog heading typo");
    expect(resolveEmptyChangelogMarkdownSpy).not.toHaveBeenCalled();
  });

  it("should render the no-change subsection when there are no changes", () => {
    expect(
      resolveChangelogGroupsMarkdown(
        { major: [], minor: [], patch: [] },
        LEVEL_HEADERS,
        "Nothing changed.",
      ),
    ).toEqual("### Changes\n\n- Nothing changed.");
    expect(resolveChangeEntrySpy).not.toHaveBeenCalled();
    expect(resolveEmptyChangelogMarkdownSpy).toHaveBeenCalledTimes(1);
    expect(resolveEmptyChangelogMarkdownSpy).toHaveBeenNthCalledWith(1, "Nothing changed.");
  });
});

describe("resolveScopeChangelogMarkdown", () => {
  const resolveGroupedChangeMessagesSpy = vi.spyOn(thisMod, "resolveGroupedChangeMessages");
  const resolveChangelogGroupsMarkdownSpy = vi.spyOn(thisMod, "resolveChangelogGroupsMarkdown");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the section of a scope version with its grouped changes", () => {
    const changes: Change[] = [
      createChange({ extends: { message: "drop Node 18 support", level: "major" } }),
    ];
    const noChangeMessage = vi.fn().mockReturnValueOnce("Nothing changed.");
    const options = createResolvedChangelogPluginOptions({
      extends: {
        sectionHeader: ({ version }) => `## ${version}`,
        levelHeaders: LEVEL_HEADERS,
        noChangeMessage,
      },
    });

    expect(resolveScopeChangelogMarkdown(SCOPE_NAMES.ALPHA, "1.2.3", changes, options)).toEqual(
      "## 1.2.3\n\n### Breaking\n\n- drop Node 18 support",
    );
    expect(mockedResolveChangelogSectionHeading).toHaveBeenCalledTimes(1);
    expect(mockedResolveChangelogSectionHeading).toHaveBeenNthCalledWith(
      1,
      options.sectionHeader,
      SCOPE_NAMES.ALPHA,
      "1.2.3",
    );
    expect(noChangeMessage).toHaveBeenCalledTimes(1);
    expect(noChangeMessage).toHaveBeenNthCalledWith(1, {
      scopeName: SCOPE_NAMES.ALPHA,
      version: "1.2.3",
    });
    expect(resolveGroupedChangeMessagesSpy).toHaveBeenCalledTimes(1);
    expect(resolveGroupedChangeMessagesSpy).toHaveBeenNthCalledWith(1, changes);
    expect(resolveChangelogGroupsMarkdownSpy).toHaveBeenCalledTimes(1);
    expect(resolveChangelogGroupsMarkdownSpy).toHaveBeenNthCalledWith(
      1,
      { major: ["drop Node 18 support"], minor: [], patch: [] },
      LEVEL_HEADERS,
      "Nothing changed.",
    );
  });
});

describe("resolveRootChangelogMarkdown", () => {
  const resolveScopeChangelogMarkdownSpy = vi.spyOn(thisMod, "resolveScopeChangelogMarkdown");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should join the sections of every scope, ordered by scope name", () => {
    const scopes = createScopeMap();
    const nextVersions = createScopeVersionMap();
    const changes = createScopeChangesMap();
    const options = createResolvedChangelogPluginOptions();

    resolveScopeChangelogMarkdownSpy.mockReturnValueOnce("## Alpha").mockReturnValueOnce("## Beta");

    expect(resolveRootChangelogMarkdown(scopes, nextVersions, changes, options)).toEqual(
      "## Alpha\n\n## Beta",
    );
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenCalledTimes(2);
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      nextVersions[SCOPE_NAMES.ALPHA].version,
      changes[SCOPE_NAMES.ALPHA],
      options,
    );
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      nextVersions[SCOPE_NAMES.BETA].version,
      changes[SCOPE_NAMES.BETA],
      options,
    );
  });

  it("should skip the scopes that are missing or without next version", () => {
    const nextVersions = {
      [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "" } }),
      [SCOPE_NAMES.MISSING]: createVersion(),
    };

    expect(
      resolveRootChangelogMarkdown(
        createScopeMap(),
        nextVersions,
        createScopeChangesMap(),
        createResolvedChangelogPluginOptions(),
      ),
    ).toEqual("");
    expect(resolveScopeChangelogMarkdownSpy).not.toHaveBeenCalled();
  });
});

describe("resolveNextChangelogContent", () => {
  it("should write the header and the sections in a new changelog", () => {
    expect(resolveNextChangelogContent("## New", "", "# Changelog")).toEqual(
      "# Changelog\n\n## New\n",
    );
  });

  it("should replace the header and keep the existing sections", () => {
    expect(
      resolveNextChangelogContent(
        "## New",
        "# History\n\nIntro.\n\n## Existing\n\n- fix\n",
        "# Changelog\n\nAll changes.",
      ),
    ).toEqual("# Changelog\n\nAll changes.\n\n## New\n\n## Existing\n\n- fix\n");
  });

  it("should keep the existing sections of a changelog with CRLF line endings", () => {
    expect(
      resolveNextChangelogContent(
        "## New",
        "# History\r\n\r\n## Existing\r\n\r\n- fix\r\n",
        "# Changelog",
      ),
    ).toEqual("# Changelog\n\n## New\n\n## Existing\n\n- fix\n");
  });

  it("should replace a changelog without section with the header and the sections", () => {
    expect(resolveNextChangelogContent("## New", "# History\n", "# Changelog")).toEqual(
      "# Changelog\n\n## New\n",
    );
  });
});

describe("resolveChangelogFileOperations", () => {
  const resolveRootChangelogMarkdownSpy = vi.spyOn(thisMod, "resolveRootChangelogMarkdown");
  const resolveScopeChangelogMarkdownSpy = vi.spyOn(thisMod, "resolveScopeChangelogMarkdown");
  const resolveNextChangelogContentSpy = vi.spyOn(thisMod, "resolveNextChangelogContent");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the root changelog content for every scope in root mode", () => {
    const scopes = createScopeMap();
    const nextVersions = createScopeVersionMap();
    const changes = createScopeChangesMap();
    const rootPath = `${CONFIG_CWD}/CHANGELOG.md`;

    const options = createResolvedChangelogPluginOptions({
      extends: { mode: "root", header: "# Changelog" },
    });

    resolveRootChangelogMarkdownSpy.mockReturnValueOnce("## Release");

    expect(
      resolveChangelogFileOperations(CONFIG_CWD, scopes, nextVersions, changes, options, {
        [rootPath]: "# Changelog\n\n## Old",
      }),
    ).toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "changelog",
          path: rootPath,
          action: "write",
          content: "# Changelog\n\n## Release\n\n## Old\n",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "changelog",
          path: rootPath,
          action: "write",
          content: "# Changelog\n\n## Release\n\n## Old\n",
          meta: {},
        },
      ],
    });

    expect(resolveRootChangelogMarkdownSpy).toHaveBeenCalledTimes(1);
    expect(resolveRootChangelogMarkdownSpy).toHaveBeenNthCalledWith(
      1,
      scopes,
      nextVersions,
      changes,
      options,
    );
    expect(resolveScopeChangelogMarkdownSpy).not.toHaveBeenCalled();
    expect(mockedResolveChangelogPath).toHaveBeenCalledTimes(2);
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      1,
      CONFIG_CWD,
      scopes[SCOPE_NAMES.ALPHA].path,
      "root",
    );
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      2,
      CONFIG_CWD,
      scopes[SCOPE_NAMES.BETA].path,
      "root",
    );
    expect(mockedResolveChangelogHeader).toHaveBeenCalledTimes(2);
    expect(mockedResolveChangelogHeader).toHaveBeenNthCalledWith(
      1,
      "# Changelog",
      SCOPE_NAMES.ALPHA,
    );
    expect(mockedResolveChangelogHeader).toHaveBeenNthCalledWith(
      2,
      "# Changelog",
      SCOPE_NAMES.BETA,
    );
    expect(resolveNextChangelogContentSpy).toHaveBeenCalledTimes(2);
    expect(resolveNextChangelogContentSpy).toHaveBeenNthCalledWith(
      1,
      "## Release",
      "# Changelog\n\n## Old",
      "# Changelog",
    );
    expect(resolveNextChangelogContentSpy).toHaveBeenNthCalledWith(
      2,
      "## Release",
      "# Changelog\n\n## Old",
      "# Changelog",
    );
  });

  it("should return each scope changelog content in scope mode", () => {
    const scopes = createScopeMap();
    const nextVersions = createScopeVersionMap();
    const changes = createScopeChangesMap();
    const alphaPath = `${scopes[SCOPE_NAMES.ALPHA].path}/CHANGELOG.md`;
    const betaPath = `${scopes[SCOPE_NAMES.BETA].path}/CHANGELOG.md`;

    const options = createResolvedChangelogPluginOptions({
      extends: {
        mode: "scope",
        header: ({ scopeName }: { scopeName: string }) => `# ${scopeName}`,
      },
    });

    resolveScopeChangelogMarkdownSpy
      .mockReturnValueOnce("## Alpha release")
      .mockReturnValueOnce("## Beta release");

    expect(
      resolveChangelogFileOperations(CONFIG_CWD, scopes, nextVersions, changes, options, {
        [alphaPath]: "",
        [betaPath]: "# Changelog\n\n## Old",
      }),
    ).toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "changelog",
          path: alphaPath,
          action: "write",
          content: "# @scope/a\n\n## Alpha release\n",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "changelog",
          path: betaPath,
          action: "write",
          content: "# @scope/b\n\n## Beta release\n\n## Old\n",
          meta: {},
        },
      ],
    });

    expect(resolveRootChangelogMarkdownSpy).not.toHaveBeenCalled();
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenCalledTimes(2);
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      nextVersions[SCOPE_NAMES.ALPHA].version,
      changes[SCOPE_NAMES.ALPHA],
      options,
    );
    expect(resolveScopeChangelogMarkdownSpy).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      nextVersions[SCOPE_NAMES.BETA].version,
      changes[SCOPE_NAMES.BETA],
      options,
    );
    expect(resolveNextChangelogContentSpy).toHaveBeenCalledTimes(2);
    expect(resolveNextChangelogContentSpy).toHaveBeenNthCalledWith(
      1,
      "## Alpha release",
      "",
      "# @scope/a",
    );
    expect(resolveNextChangelogContentSpy).toHaveBeenNthCalledWith(
      2,
      "## Beta release",
      "# Changelog\n\n## Old",
      "# @scope/b",
    );
  });

  it("should skip scopes when scope is missing or version is empty", () => {
    const nextVersions = {
      [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "" } }),
      [SCOPE_NAMES.MISSING]: createVersion(),
    };

    expect(
      resolveChangelogFileOperations(
        CONFIG_CWD,
        createScopeMap(),
        nextVersions,
        createScopeChangesMap(),
        createResolvedChangelogPluginOptions({ extends: { mode: "scope" } }),
        {},
      ),
    ).toEqual({});

    expect(resolveNextChangelogContentSpy).not.toHaveBeenCalled();
  });
});

describe("createGenerateFileOperationsPhase", () => {
  const resolveChangelogFileOperationsSpy = vi.spyOn(thisMod, "resolveChangelogFileOperations");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read the changelog of every scope in scope mode", async () => {
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState();
    const alphaPath = `${context.scopes[SCOPE_NAMES.ALPHA].path}/CHANGELOG.md`;
    const betaPath = `${context.scopes[SCOPE_NAMES.BETA].path}/CHANGELOG.md`;
    const fileOperations = createScopeFileOperationsMap();

    vi.mocked(context.fs.read)
      .mockResolvedValueOnce("# Changelog\n\n## Alpha")
      .mockResolvedValueOnce("");
    resolveChangelogFileOperationsSpy.mockReturnValueOnce(fileOperations);

    const options = createResolvedChangelogPluginOptions({ extends: { mode: "scope" } });
    const phase = createGenerateFileOperationsPhase(options);

    await expect(phase(context, state)).resolves.toEqual(fileOperations);

    expect(mockedResolveChangelogPath).toHaveBeenCalledTimes(2);
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      context.scopes[SCOPE_NAMES.ALPHA].path,
      "scope",
    );
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      2,
      context.cwd,
      context.scopes[SCOPE_NAMES.BETA].path,
      "scope",
    );
    expect(context.fs.read).toHaveBeenCalledTimes(2);
    expect(context.fs.read).toHaveBeenNthCalledWith(1, alphaPath, "");
    expect(context.fs.read).toHaveBeenNthCalledWith(2, betaPath, "");
    expect(resolveChangelogFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveChangelogFileOperationsSpy).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      context.scopes,
      state.nextVersions,
      state.changes,
      options,
      { [alphaPath]: "# Changelog\n\n## Alpha", [betaPath]: "" },
    );
  });

  it("should read the root changelog once in root mode", async () => {
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState();
    const rootPath = `${context.cwd}/CHANGELOG.md`;
    const fileOperations = createScopeFileOperationsMap();

    vi.mocked(context.fs.read).mockResolvedValueOnce("# Changelog\n\n## Old");
    resolveChangelogFileOperationsSpy.mockReturnValueOnce(fileOperations);

    const options = createResolvedChangelogPluginOptions({ extends: { mode: "root" } });
    const phase = createGenerateFileOperationsPhase(options);

    await expect(phase(context, state)).resolves.toEqual(fileOperations);

    expect(context.fs.read).toHaveBeenCalledTimes(1);
    expect(context.fs.read).toHaveBeenNthCalledWith(1, rootPath, "");
    expect(resolveChangelogFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveChangelogFileOperationsSpy).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      context.scopes,
      state.nextVersions,
      state.changes,
      options,
      { [rootPath]: "# Changelog\n\n## Old" },
    );
  });

  it("should skip reading changelogs for scopes that are missing or without next version", async () => {
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({
      nextVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "" } }),
        [SCOPE_NAMES.MISSING]: createVersion(),
      },
    });

    resolveChangelogFileOperationsSpy.mockReturnValueOnce({});

    const options = createResolvedChangelogPluginOptions({ extends: { mode: "scope" } });
    const phase = createGenerateFileOperationsPhase(options);

    await expect(phase(context, state)).resolves.toEqual({});

    expect(mockedResolveChangelogPath).not.toHaveBeenCalled();
    expect(context.fs.read).not.toHaveBeenCalled();
    expect(resolveChangelogFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveChangelogFileOperationsSpy).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      context.scopes,
      state.nextVersions,
      state.changes,
      options,
      {},
    );
  });
});
