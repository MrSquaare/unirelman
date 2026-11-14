import {
  mockedResolveChangelogPath,
  mockedResolveChangelogSectionHeading,
} from "../helpers/changelog.mock";

import {
  createPhaseContext,
  createCreateReleasesState,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogSectionHeader,
} from "../helpers/changelog";
import { createResolvedChangelogPluginOptions } from "../helpers/options.fixture";
import { createGetReleaseNotesPhase, resolveChangelogSection } from "./get-release-notes";
import * as thisMod from "./get-release-notes";

const CHANGELOG =
  "# Changelog\n\n## @scope/a - 1.0.1\n\n### Patch changes\n- fix a bug\n\n## @scope/b - 2.0.0\n\n### Minor changes\n- add a feature\n";

describe("resolveChangelogSection", () => {
  it("should return the body of a section followed by another section", () => {
    expect(resolveChangelogSection(CHANGELOG, "## @scope/a - 1.0.1")).toEqual(
      "### Patch changes\n- fix a bug",
    );
  });

  it("should return the body of the last section", () => {
    expect(resolveChangelogSection(CHANGELOG, "## @scope/b - 2.0.0")).toEqual(
      "### Minor changes\n- add a feature",
    );
  });

  it("should keep headings inside fenced code blocks in the section", () => {
    expect(
      resolveChangelogSection(
        "## 1.0.1\n\n- add a section\n  ```md\n## Example\n  ```\n- add a list\n~~~~\n## Tilde\n~~~\n~~~~\n\n## 1.0.0\n\n- initial",
        "## 1.0.1",
      ),
    ).toEqual(
      "- add a section\n  ```md\n## Example\n  ```\n- add a list\n~~~~\n## Tilde\n~~~\n~~~~",
    );
  });

  it("should keep the rest of the changelog when a code block is not closed", () => {
    expect(resolveChangelogSection("## 1.0.1\n```\n## 1.0.0\n- initial", "## 1.0.1")).toEqual(
      "```\n## 1.0.0\n- initial",
    );
  });

  it("should return undefined when the section is missing", () => {
    expect(resolveChangelogSection(CHANGELOG, "## @scope/a - 1.0.0")).toEqual(undefined);
  });
});

describe("createGetReleaseNotesPhase", () => {
  const resolveChangelogSectionSpy = vi.spyOn(thisMod, "resolveChangelogSection");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read the root changelog once and return the section of every scope", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
        [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
      },
    });
    const rootPath = `${context.cwd}/CHANGELOG.md`;

    vi.mocked(context.fs.read).mockResolvedValueOnce(CHANGELOG);

    const phase = createGetReleaseNotesPhase(
      createResolvedChangelogPluginOptions({
        extends: { mode: "root", sectionHeader: resolveRootChangelogSectionHeader },
      }),
    );

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: "### Patch changes\n- fix a bug",
      [SCOPE_NAMES.BETA]: "### Minor changes\n- add a feature",
    });
    expect(mockedResolveChangelogPath).toHaveBeenCalledTimes(2);
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      context.scopes[SCOPE_NAMES.ALPHA].path,
      "root",
    );
    expect(mockedResolveChangelogPath).toHaveBeenNthCalledWith(
      2,
      context.cwd,
      context.scopes[SCOPE_NAMES.BETA].path,
      "root",
    );
    expect(context.fs.read).toHaveBeenCalledTimes(1);
    expect(context.fs.read).toHaveBeenNthCalledWith(1, rootPath, "");
    expect(mockedResolveChangelogSectionHeading).toHaveBeenCalledTimes(2);
    expect(mockedResolveChangelogSectionHeading).toHaveBeenNthCalledWith(
      1,
      resolveRootChangelogSectionHeader,
      SCOPE_NAMES.ALPHA,
      "1.0.1",
    );
    expect(mockedResolveChangelogSectionHeading).toHaveBeenNthCalledWith(
      2,
      resolveRootChangelogSectionHeader,
      SCOPE_NAMES.BETA,
      "2.0.0",
    );
    expect(resolveChangelogSectionSpy).toHaveBeenCalledTimes(2);
    expect(resolveChangelogSectionSpy).toHaveBeenNthCalledWith(1, CHANGELOG, "## @scope/a - 1.0.1");
    expect(resolveChangelogSectionSpy).toHaveBeenNthCalledWith(2, CHANGELOG, "## @scope/b - 2.0.0");
  });

  it("should read the changelog of every scope in scope mode", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
        [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
      },
    });

    vi.mocked(context.fs.read)
      .mockResolvedValueOnce("# Changelog\n\n## 1.0.1\n\n### Patch changes\n- fix a bug\n")
      .mockResolvedValueOnce("");

    const phase = createGetReleaseNotesPhase(
      createResolvedChangelogPluginOptions({
        extends: { mode: "scope", sectionHeader: resolveScopeChangelogSectionHeader },
      }),
    );

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: "### Patch changes\n- fix a bug",
    });
    expect(context.fs.read).toHaveBeenCalledTimes(2);
    expect(context.fs.read).toHaveBeenNthCalledWith(
      1,
      `${context.scopes[SCOPE_NAMES.ALPHA].path}/CHANGELOG.md`,
      "",
    );
    expect(context.fs.read).toHaveBeenNthCalledWith(
      2,
      `${context.scopes[SCOPE_NAMES.BETA].path}/CHANGELOG.md`,
      "",
    );
  });

  it("should skip scopes that are missing or without current version", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "" } }),
        [SCOPE_NAMES.MISSING]: createVersion({ extends: { version: "1.0.0" } }),
      },
    });

    const phase = createGetReleaseNotesPhase(
      createResolvedChangelogPluginOptions({
        extends: { mode: "root", sectionHeader: resolveRootChangelogSectionHeader },
      }),
    );

    await expect(phase(context, state)).resolves.toEqual({});
    expect(context.fs.read).not.toHaveBeenCalled();
    expect(resolveChangelogSectionSpy).not.toHaveBeenCalled();
  });
});
