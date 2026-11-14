import { mockedGetInput } from "@unirelman/testing/mocks/actions/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readActionInputs } from "./inputs";

describe("readActionInputs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read every required input", () => {
    mockedGetInput
      .mockReturnValueOnce("pnpm exec unirelman")
      .mockReturnValueOnce("/workspace/integrations/github-action")
      .mockReturnValueOnce("token")
      .mockReturnValueOnce("main")
      .mockReturnValueOnce("unirelman/release")
      .mockReturnValueOnce("chore(release): bump versions");

    expect(readActionInputs()).toEqual({
      command: "pnpm exec unirelman",
      workingDirectory: "/workspace/integrations/github-action",
      githubToken: "token",
      baseBranch: "main",
      branch: "unirelman/release",
      prTitle: "chore(release): bump versions",
    });
    expect(mockedGetInput).toHaveBeenCalledTimes(6);
    expect(mockedGetInput).toHaveBeenNthCalledWith(1, "command", { required: true });
    expect(mockedGetInput).toHaveBeenNthCalledWith(2, "working-directory", { required: true });
    expect(mockedGetInput).toHaveBeenNthCalledWith(3, "github-token", { required: true });
    expect(mockedGetInput).toHaveBeenNthCalledWith(4, "base-branch", { required: true });
    expect(mockedGetInput).toHaveBeenNthCalledWith(5, "branch", { required: true });
    expect(mockedGetInput).toHaveBeenNthCalledWith(6, "pr-title", { required: true });
  });
});
