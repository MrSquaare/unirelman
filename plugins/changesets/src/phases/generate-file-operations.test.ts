import {
  createChange,
  createGenerateFileOperationsState,
  createPhaseContext,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runGenerateFileOperationsPhase } from "./generate-file-operations";

describe("runGenerateFileOperationsPhase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a delete content for every changeset of every scope", async () => {
    const context = createPhaseContext({ cwd: "/repo" });
    const state = createGenerateFileOperationsState({
      changes: {
        [SCOPE_NAMES.ALPHA]: [
          createChange({ extends: { meta: { changesets: { path: "one.md" } } } }),
          createChange(),
        ],
        [SCOPE_NAMES.BETA]: [
          createChange({ extends: { meta: { changesets: { path: "two.md" } } } }),
          createChange({ extends: { meta: { changesets: { path: "one.md" } } } }),
        ],
      },
    });

    vi.mocked(context.store.resolvePath)
      .mockReturnValueOnce("/repo/.unirelman/changesets/one.md")
      .mockReturnValueOnce("/repo/.unirelman/changesets/two.md")
      .mockReturnValueOnce("/repo/.unirelman/changesets/one.md");

    await expect(runGenerateFileOperationsPhase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "changeset",
          path: "/repo/.unirelman/changesets/one.md",
          action: "delete",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "changeset",
          path: "/repo/.unirelman/changesets/two.md",
          action: "delete",
          meta: {},
        },
        {
          type: "changeset",
          path: "/repo/.unirelman/changesets/one.md",
          action: "delete",
          meta: {},
        },
      ],
    });

    expect(context.store.resolvePath).toHaveBeenCalledTimes(3);
    expect(context.store.resolvePath).toHaveBeenNthCalledWith(1, "one.md");
    expect(context.store.resolvePath).toHaveBeenNthCalledWith(2, "two.md");
    expect(context.store.resolvePath).toHaveBeenNthCalledWith(3, "one.md");
  });

  it("should return no content when no change comes from a changeset", async () => {
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({
      changes: { [SCOPE_NAMES.ALPHA]: [createChange()] },
    });

    await expect(runGenerateFileOperationsPhase(context, state)).resolves.toEqual({});
  });
});
