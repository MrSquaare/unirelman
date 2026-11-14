import {
  createFileDelete,
  createRelease,
  createVersion,
  createFileWrite,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { mockedDedupeFileOperations } from "@unirelman/core/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolvePipelineOutput,
  resolvePublishOutput,
  resolveVersionOutput,
} from "./pipeline-output";
import * as thisMod from "./pipeline-output";

describe("resolveVersionOutput", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the versions of every scope and the deduped files relative to cwd", () => {
    const changelogContent = createFileWrite({ extends: { path: "/repo/CHANGELOG.md" } });
    const changesetContent = createFileDelete({
      extends: { path: "/repo/.unirelman/changesets/a.md" },
    });
    const fileOperations = {
      [SCOPE_NAMES.ALPHA]: [changelogContent, changesetContent],
      [SCOPE_NAMES.BETA]: [changelogContent],
    };

    expect(
      resolveVersionOutput("/repo", {
        pipeline: "version",
        dryRun: true,
        currentVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.0" } }) },
        changes: {},
        nextVersions: {
          [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
          [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
        },
        fileOperations,
      }),
    ).toEqual({
      pipeline: "version",
      dryRun: true,
      scopes: {
        [SCOPE_NAMES.ALPHA]: { currentVersion: "1.0.0", nextVersion: "1.0.1" },
        [SCOPE_NAMES.BETA]: { currentVersion: null, nextVersion: "2.0.0" },
      },
      files: [
        { path: "CHANGELOG.md", action: "write" },
        { path: ".unirelman/changesets/a.md", action: "delete" },
      ],
    });

    expect(mockedDedupeFileOperations).toHaveBeenCalledTimes(1);
    expect(mockedDedupeFileOperations).toHaveBeenNthCalledWith(1, fileOperations);
  });
});

describe("resolvePublishOutput", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the releases of every scope with their meta", () => {
    expect(
      resolvePublishOutput({
        pipeline: "publish",
        dryRun: false,
        currentVersions: {},
        releaseNotes: {},
        releases: {
          [SCOPE_NAMES.ALPHA]: [
            createRelease({
              extends: {
                type: "git-tag",
                name: "@scope/a@1.0.1",
                status: "created",
                meta: { id: 42 },
              },
            }),
            createRelease({
              extends: {
                type: "npm-package",
                name: "@scope/a@1.0.1",
                status: "existing",
                meta: {},
              },
            }),
          ],
        },
      }),
    ).toEqual({
      pipeline: "publish",
      dryRun: false,
      releases: {
        [SCOPE_NAMES.ALPHA]: [
          { type: "git-tag", name: "@scope/a@1.0.1", status: "created", meta: { id: 42 } },
          { type: "npm-package", name: "@scope/a@1.0.1", status: "existing", meta: {} },
        ],
      },
    });
  });
});

describe("resolvePipelineOutput", () => {
  const resolveVersionOutputSpy = vi.spyOn(thisMod, "resolveVersionOutput");
  const resolvePublishOutputSpy = vi.spyOn(thisMod, "resolvePublishOutput");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format the version pipeline result", () => {
    const result = {
      pipeline: "version" as const,
      dryRun: false,
      currentVersions: {},
      changes: {},
      nextVersions: {},
      fileOperations: {},
    };

    expect(resolvePipelineOutput("/repo", result)).toEqual({
      pipeline: "version",
      dryRun: false,
      scopes: {},
      files: [],
    });

    expect(resolveVersionOutputSpy).toHaveBeenCalledTimes(1);
    expect(resolveVersionOutputSpy).toHaveBeenNthCalledWith(1, "/repo", result);
    expect(resolvePublishOutputSpy).not.toHaveBeenCalled();
  });

  it("should format the publish pipeline result", () => {
    const result = {
      pipeline: "publish" as const,
      dryRun: false,
      currentVersions: {},
      releaseNotes: {},
      releases: {},
    };

    expect(resolvePipelineOutput("/repo", result)).toEqual({
      pipeline: "publish",
      dryRun: false,
      releases: {},
    });

    expect(resolvePublishOutputSpy).toHaveBeenCalledTimes(1);
    expect(resolvePublishOutputSpy).toHaveBeenNthCalledWith(1, result);
    expect(resolveVersionOutputSpy).not.toHaveBeenCalled();
  });
});
