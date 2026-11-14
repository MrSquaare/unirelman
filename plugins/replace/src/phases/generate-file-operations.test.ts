import {
  createGenerateFileOperationsState,
  createPhaseContext,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReplaceNoMatchError, ReplaceUnknownScopeError } from "../errors";
import { createResolvedReplaceFile } from "../helpers/options.fixture";
import {
  createGenerateFileOperationsPhase,
  resolveGlobalRegExp,
  resolveReplacedContent,
  resolveReplaceFileOperations,
  resolveReplaceRegExp,
} from "./generate-file-operations";
import * as thisMod from "./generate-file-operations";

const INPUT = { scopeName: SCOPE_NAMES.ALPHA, currentVersion: "1.0.0", nextVersion: "1.1.0" };

describe("resolveReplaceRegExp", () => {
  it("should return the search when it is a regular expression", () => {
    expect(resolveReplaceRegExp(/my-package@1\.0\.0/, INPUT)).toEqual(/my-package@1\.0\.0/);
  });

  it("should return the result of the search when it is a function", () => {
    const search = vi.fn().mockReturnValueOnce(/my-package@1\.0\.0/);

    expect(resolveReplaceRegExp(search, INPUT)).toEqual(/my-package@1\.0\.0/);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenNthCalledWith(1, INPUT);
  });
});

describe("resolveGlobalRegExp", () => {
  it("should return a global regular expression as is", () => {
    const search = /my-package@\d+\.\d+\.\d+/g;

    expect(resolveGlobalRegExp(search)).toEqual(search);
  });

  it("should add the global flag and keep the other flags", () => {
    expect(resolveGlobalRegExp(/my-package@\d+/i)).toEqual(/my-package@\d+/gi);
  });
});

describe("resolveReplacedContent", () => {
  const resolveReplaceRegExpSpy = vi.spyOn(thisMod, "resolveReplaceRegExp");
  const resolveGlobalRegExpSpy = vi.spyOn(thisMod, "resolveGlobalRegExp");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should replace every match with the result of replace", () => {
    const replace = vi
      .fn()
      .mockReturnValueOnce("my-package@1.1.0")
      .mockReturnValueOnce("my-package@1.1.0");
    const file = createResolvedReplaceFile({ extends: { search: /my-package@1\.0\.0/, replace } });

    expect(
      resolveReplacedContent("uses my-package@1.0.0 and my-package@1.0.0.", file, INPUT),
    ).toEqual("uses my-package@1.1.0 and my-package@1.1.0.");
    expect(resolveReplaceRegExpSpy).toHaveBeenCalledTimes(1);
    expect(resolveReplaceRegExpSpy).toHaveBeenNthCalledWith(1, /my-package@1\.0\.0/, INPUT);
    expect(resolveGlobalRegExpSpy).toHaveBeenCalledTimes(1);
    expect(resolveGlobalRegExpSpy).toHaveBeenNthCalledWith(1, /my-package@1\.0\.0/);
    expect(replace).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenNthCalledWith(1, INPUT);
    expect(replace).toHaveBeenNthCalledWith(2, INPUT);
  });

  it("should insert the replacement literally", () => {
    const file = createResolvedReplaceFile({
      extends: { search: /my-package@1\.0\.0/, replace: () => "$&-$1" },
    });

    expect(resolveReplacedContent("my-package@1.0.0", file, INPUT)).toEqual("$&-$1");
  });

  it("should return undefined when nothing matches and allowNoMatch is set", () => {
    const replace = vi.fn();
    const file = createResolvedReplaceFile({
      extends: { search: /my-package@1\.0\.0/, replace, allowNoMatch: true },
    });

    expect(resolveReplacedContent("no reference", file, INPUT)).toEqual(undefined);
    expect(resolveGlobalRegExpSpy).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("should throw when nothing matches", () => {
    const file = createResolvedReplaceFile({
      extends: { path: "README.md", search: /my-package@1\.0\.0/, allowNoMatch: false },
    });

    expect(() => resolveReplacedContent("no reference", file, INPUT)).toThrow(
      new ReplaceNoMatchError("README.md", /my-package@1\.0\.0/),
    );
  });
});

describe("resolveReplaceFileOperations", () => {
  it("should give each scope a write of each file it replaced in", () => {
    expect(
      resolveReplaceFileOperations(
        new Map([
          [
            "README.md",
            { content: "readme", scopeNames: new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]) },
          ],
          ["docs/index.md", { content: "docs", scopeNames: new Set([SCOPE_NAMES.ALPHA]) }],
        ]),
      ),
    ).toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "replace", path: "README.md", action: "write", content: "readme", meta: {} },
        { type: "replace", path: "docs/index.md", action: "write", content: "docs", meta: {} },
      ],
      [SCOPE_NAMES.BETA]: [
        { type: "replace", path: "README.md", action: "write", content: "readme", meta: {} },
      ],
    });
  });

  it("should return no file operation without replaced files", () => {
    expect(resolveReplaceFileOperations(new Map())).toEqual({});
  });
});

describe("createGenerateFileOperationsPhase", () => {
  const resolveReplacedContentSpy = vi.spyOn(thisMod, "resolveReplacedContent");
  const resolveReplaceFileOperationsSpy = vi.spyOn(thisMod, "resolveReplaceFileOperations");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should apply the files of the scopes with a next version, reading each file once", async () => {
    const alphaFile = createResolvedReplaceFile({
      extends: {
        path: "README.md",
        scope: SCOPE_NAMES.ALPHA,
        search: ({ currentVersion }) => new RegExp(`@scope/a@${currentVersion}`),
        replace: ({ nextVersion }) => `@scope/a@${nextVersion}`,
      },
    });
    const betaFile = createResolvedReplaceFile({
      extends: {
        path: "README.md",
        scope: SCOPE_NAMES.BETA,
        search: /@scope\/b@\d+\.\d+\.\d+/,
        replace: ({ nextVersion }) => `@scope/b@${nextVersion}`,
      },
    });
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.0" } }),
      },
      nextVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }),
        [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
      },
    });

    vi.mocked(context.fs.read).mockResolvedValueOnce("@scope/a@1.0.0 @scope/b@1.0.0");

    await expect(
      createGenerateFileOperationsPhase({ files: [alphaFile, betaFile] })(context, state),
    ).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "replace",
          path: "README.md",
          action: "write",
          content: "@scope/a@1.1.0 @scope/b@2.0.0",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "replace",
          path: "README.md",
          action: "write",
          content: "@scope/a@1.1.0 @scope/b@2.0.0",
          meta: {},
        },
      ],
    });
    expect(context.fs.read).toHaveBeenCalledTimes(1);
    expect(context.fs.read).toHaveBeenNthCalledWith(1, "README.md");
    expect(resolveReplacedContentSpy).toHaveBeenCalledTimes(2);
    expect(resolveReplacedContentSpy).toHaveBeenNthCalledWith(
      1,
      "@scope/a@1.0.0 @scope/b@1.0.0",
      alphaFile,
      { scopeName: SCOPE_NAMES.ALPHA, currentVersion: "1.0.0", nextVersion: "1.1.0" },
    );
    expect(resolveReplacedContentSpy).toHaveBeenNthCalledWith(
      2,
      "@scope/a@1.1.0 @scope/b@1.0.0",
      betaFile,
      { scopeName: SCOPE_NAMES.BETA, currentVersion: undefined, nextVersion: "2.0.0" },
    );
    expect(resolveReplaceFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveReplaceFileOperationsSpy).toHaveBeenNthCalledWith(
      1,
      new Map([
        [
          "README.md",
          {
            content: "@scope/a@1.1.0 @scope/b@2.0.0",
            scopeNames: new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
          },
        ],
      ]),
    );
  });

  it("should skip the files of a scope without a next version", async () => {
    const file = createResolvedReplaceFile({ extends: { scope: SCOPE_NAMES.BETA } });
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({
      nextVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }) },
    });

    await expect(
      createGenerateFileOperationsPhase({ files: [file] })(context, state),
    ).resolves.toEqual({});
    expect(context.fs.read).not.toHaveBeenCalled();
    expect(resolveReplacedContentSpy).not.toHaveBeenCalled();
    expect(resolveReplaceFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveReplaceFileOperationsSpy).toHaveBeenNthCalledWith(1, new Map());
  });

  it("should give no file operation for an entry without a match", async () => {
    const file = createResolvedReplaceFile({
      extends: { scope: SCOPE_NAMES.ALPHA, search: /my-package@1\.0\.0/, allowNoMatch: true },
    });
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({
      nextVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }) },
    });

    vi.mocked(context.fs.read).mockResolvedValueOnce("no reference");

    await expect(
      createGenerateFileOperationsPhase({ files: [file] })(context, state),
    ).resolves.toEqual({});
    expect(resolveReplacedContentSpy).toHaveBeenCalledTimes(1);
    expect(resolveReplaceFileOperationsSpy).toHaveBeenCalledTimes(1);
    expect(resolveReplaceFileOperationsSpy).toHaveBeenNthCalledWith(1, new Map());
  });

  it("should throw when a file names a scope outside the plugin", async () => {
    const file = createResolvedReplaceFile({
      extends: { path: "README.md", scope: SCOPE_NAMES.MISSING },
    });

    await expect(
      createGenerateFileOperationsPhase({ files: [file] })(
        createPhaseContext(),
        createGenerateFileOperationsState(),
      ),
    ).rejects.toThrow(new ReplaceUnknownScopeError("README.md", SCOPE_NAMES.MISSING));
    expect(resolveReplaceFileOperationsSpy).not.toHaveBeenCalled();
  });
});
