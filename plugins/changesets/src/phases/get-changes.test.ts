import { mockedParseChangesetFile } from "../helpers/changeset.mock";

import {
  createGetChangesState,
  createPhaseContext,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runGetChangesPhase } from "./get-changes";

describe("runGetChangesPhase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the changes of every changeset file for each of its scopes", async () => {
    const context = createPhaseContext();
    const state = createGetChangesState();
    const firstFile = {
      path: "first.md",
      content: `---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: patch\n---\nAlpha\n`,
    };
    const secondFile = {
      path: "second.md",
      content: `---\nscopes: ${SCOPE_NAMES.ALPHA},${SCOPE_NAMES.BETA}\nlevel: minor\n---\nBeta\n`,
    };

    vi.mocked(context.store.readAll).mockResolvedValueOnce([firstFile, secondFile]);

    await expect(runGetChangesPhase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { message: "Alpha", level: "patch", meta: { changesets: { path: "first.md" } } },
        { message: "Beta", level: "minor", meta: { changesets: { path: "second.md" } } },
      ],
      [SCOPE_NAMES.BETA]: [
        { message: "Beta", level: "minor", meta: { changesets: { path: "second.md" } } },
      ],
    });

    expect(context.store.readAll).toHaveBeenCalledTimes(1);
    expect(context.store.readAll).toHaveBeenNthCalledWith(1);
    expect(mockedParseChangesetFile).toHaveBeenCalledTimes(2);
    expect(mockedParseChangesetFile).toHaveBeenNthCalledWith(1, firstFile, [
      SCOPE_NAMES.ALPHA,
      SCOPE_NAMES.BETA,
    ]);
    expect(mockedParseChangesetFile).toHaveBeenNthCalledWith(2, secondFile, [
      SCOPE_NAMES.ALPHA,
      SCOPE_NAMES.BETA,
    ]);
  });

  it("should skip files that are not changesets", async () => {
    const context = createPhaseContext();
    const state = createGetChangesState();

    vi.mocked(context.store.readAll).mockResolvedValueOnce([
      { path: "notes.txt", content: "not markdown" },
    ]);

    await expect(runGetChangesPhase(context, state)).resolves.toEqual({});

    expect(mockedParseChangesetFile).not.toHaveBeenCalled();
  });
});
