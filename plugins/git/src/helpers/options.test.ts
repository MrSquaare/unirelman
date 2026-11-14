import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveGitPluginOptions } from "./options";

describe("resolveGitPluginOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve options when custom options are provided", () => {
    const tagFormat = vi.fn();

    expect(
      resolveGitPluginOptions({
        commitMessage: "chore: release",
        tagFormat,
        annotatedTags: true,
      }),
    ).toEqual({
      commitMessage: "chore: release",
      tagFormat,
      annotatedTags: true,
    });
  });

  it("should resolve default options when options are omitted", () => {
    expect(resolveGitPluginOptions()).toEqual({
      commitMessage: "chore(release): bump versions",
      tagFormat: resolveDefaultGitTag,
      annotatedTags: false,
    });
  });
});
