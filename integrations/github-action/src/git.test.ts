import { mockedExec, mockedGetExecOutput } from "@unirelman/testing/mocks/actions/exec";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkoutBranch,
  commitFiles,
  configureGitIdentity,
  hasGitIdentity,
  pushBranch,
  pushGitTags,
  readHeadCommit,
  resolvePublishedGitTags,
} from "./git";
import * as thisMod from "./git";

const CWD = "/workspace";
const IDENTITY_OPTIONS = { cwd: CWD, ignoreReturnCode: true, silent: true };

describe("hasGitIdentity", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when author and committer identities are configured", async () => {
    mockedGetExecOutput
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

    await expect(hasGitIdentity(CWD)).resolves.toEqual(true);
    expect(mockedGetExecOutput).toHaveBeenCalledTimes(2);
    expect(mockedGetExecOutput).toHaveBeenNthCalledWith(
      1,
      "git",
      ["-c", "user.useConfigOnly=true", "var", "GIT_AUTHOR_IDENT"],
      IDENTITY_OPTIONS,
    );
    expect(mockedGetExecOutput).toHaveBeenNthCalledWith(
      2,
      "git",
      ["-c", "user.useConfigOnly=true", "var", "GIT_COMMITTER_IDENT"],
      IDENTITY_OPTIONS,
    );
  });

  it("should return false when the author identity is missing", async () => {
    mockedGetExecOutput.mockResolvedValueOnce({ exitCode: 128, stdout: "", stderr: "" });

    await expect(hasGitIdentity(CWD)).resolves.toEqual(false);
    expect(mockedGetExecOutput).toHaveBeenCalledTimes(1);
  });

  it("should return false when the committer identity is missing", async () => {
    mockedGetExecOutput
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ exitCode: 128, stdout: "", stderr: "" });

    await expect(hasGitIdentity(CWD)).resolves.toEqual(false);
    expect(mockedGetExecOutput).toHaveBeenCalledTimes(2);
  });
});

describe("configureGitIdentity", () => {
  const hasGitIdentitySpy = vi.spyOn(thisMod, "hasGitIdentity");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should configure the GitHub Actions bot when no identity is configured", async () => {
    hasGitIdentitySpy.mockResolvedValueOnce(false);

    await expect(configureGitIdentity(CWD)).resolves.toEqual(undefined);
    expect(hasGitIdentitySpy).toHaveBeenCalledTimes(1);
    expect(hasGitIdentitySpy).toHaveBeenNthCalledWith(1, CWD);
    expect(mockedExec).toHaveBeenCalledTimes(2);
    expect(mockedExec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["config", "user.name", "github-actions[bot]"],
      { cwd: CWD },
    );
    expect(mockedExec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
      { cwd: CWD },
    );
  });

  it("should keep the configured identity", async () => {
    hasGitIdentitySpy.mockResolvedValueOnce(true);

    await expect(configureGitIdentity(CWD)).resolves.toEqual(undefined);
    expect(mockedExec).not.toHaveBeenCalled();
  });
});

describe("resolvePublishedGitTags", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the git tag names of every scope, created or existing", () => {
    expect(
      resolvePublishedGitTags({
        pipeline: "publish",
        dryRun: false,
        releases: new Map([
          [
            "@scope/a",
            [
              { type: "git-tag", name: "@scope/a@1.0.1", status: "created", meta: {} },
              { type: "npm-package", name: "@scope/a@1.0.1", status: "created", meta: {} },
            ],
          ],
          ["@scope/b", [{ type: "git-tag", name: "@scope/b@2.0.0", status: "existing", meta: {} }]],
        ]),
      }),
    ).toEqual(["@scope/a@1.0.1", "@scope/b@2.0.0"]);
  });
});

describe("pushGitTags", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should push every tag to origin", async () => {
    await expect(pushGitTags(CWD, ["@scope/a@1.0.1", "2.0.0"])).resolves.toEqual(undefined);
    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(mockedExec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["push", "origin", "refs/tags/@scope/a@1.0.1", "refs/tags/2.0.0"],
      { cwd: CWD },
    );
  });

  it("should push nothing when there are no tags", async () => {
    await expect(pushGitTags(CWD, [])).resolves.toEqual(undefined);
    expect(mockedExec).not.toHaveBeenCalled();
  });
});

describe("commitFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should stage the given paths and commit them with the message", async () => {
    await expect(
      commitFiles(
        CWD,
        [".unirelman/github-action/settings.json"],
        "chore(release): enable publishing",
      ),
    ).resolves.toEqual(undefined);
    expect(mockedExec).toHaveBeenCalledTimes(2);
    expect(mockedExec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["add", "--", ".unirelman/github-action/settings.json"],
      { cwd: CWD },
    );
    expect(mockedExec).toHaveBeenNthCalledWith(
      2,
      "git",
      ["commit", "-m", "chore(release): enable publishing"],
      { cwd: CWD },
    );
  });
});

describe("checkoutBranch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create or reset the branch on the current commit", async () => {
    await expect(checkoutBranch(CWD, "unirelman/release")).resolves.toEqual(undefined);
    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(mockedExec).toHaveBeenNthCalledWith(1, "git", ["checkout", "-B", "unirelman/release"], {
      cwd: CWD,
    });
  });
});

describe("readHeadCommit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the trimmed HEAD commit", async () => {
    mockedGetExecOutput.mockResolvedValueOnce({ exitCode: 0, stdout: "abc123\n", stderr: "" });

    await expect(readHeadCommit(CWD)).resolves.toEqual("abc123");
    expect(mockedGetExecOutput).toHaveBeenCalledTimes(1);
    expect(mockedGetExecOutput).toHaveBeenNthCalledWith(1, "git", ["rev-parse", "HEAD"], {
      cwd: CWD,
    });
  });
});

describe("pushBranch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should force-push the branch to origin", async () => {
    await expect(pushBranch(CWD, "unirelman/release")).resolves.toEqual(undefined);
    expect(mockedExec).toHaveBeenCalledTimes(1);
    expect(mockedExec).toHaveBeenNthCalledWith(
      1,
      "git",
      ["push", "--force", "origin", "unirelman/release"],
      { cwd: CWD },
    );
  });
});
