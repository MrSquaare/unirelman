import {
  mockedResolveUnirelmanEnvironment,
  mockedRunUnirelmanPublish,
  mockedRunUnirelmanVersion,
} from "./cli.mock";
import {
  mockedCheckoutBranch,
  mockedCommitFiles,
  mockedConfigureGitIdentity,
  mockedPushBranch,
  mockedPushGitTags,
  mockedReadHeadCommit,
  mockedResolvePublishedGitTags,
} from "./git.mock";
import { mockedReadActionInputs } from "./inputs.mock";
import {
  mockedCloseReleasePullRequest,
  mockedFindReleasePullRequest,
  mockedFormatReleasePullRequestBody,
  mockedUpsertReleasePullRequest,
} from "./pull-request.mock";
import {
  mockedReadActionSettings,
  mockedResolveActionSettingsPath,
  mockedWriteActionSettings,
} from "./settings.mock";

import { MockedStore } from "@unirelman/core/testing/mock";
import { mockedInfo, mockedSetOutput } from "@unirelman/testing/mocks/actions/core";
import { mockedGetOctokit } from "@unirelman/testing/mocks/actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GitHubClient } from "./types";

import { ActionMissingReleaseCommitError } from "./errors";
import * as thisMod from "./main";
import { runAction, runPublishStep, runVersionStep, syncReleasePullRequest } from "./main";
import { createActionInputs } from "./types.fixture";

const REPOSITORY = { owner: "owner", repo: "repo" };
const PUBLISH_OUTPUT = {
  pipeline: "publish" as const,
  dryRun: false,
  releases: new Map([
    [
      "@scope/a",
      [{ type: "git-tag", name: "@scope/a@1.0.0", status: "existing" as const, meta: {} }],
    ],
  ]),
};
const UNIRELMAN_ENVIRONMENT = { GITHUB_TOKEN: "token" };
const VERSION_OUTPUT = {
  pipeline: "version" as const,
  dryRun: false,
  scopes: new Map([["@scope/a", { currentVersion: "1.0.0", nextVersion: "1.0.1" }]]),
  files: [{ path: "CHANGELOG.md", action: "write" as const }],
};
const EMPTY_VERSION_OUTPUT = { ...VERSION_OUTPUT, scopes: new Map(), files: [] };
const SETTINGS_PATH = "/workspace/.unirelman/github-action/settings.json";

describe("runPublishStep", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish, push the git tags of the releases and output the releases", async () => {
    const inputs = createActionInputs();

    mockedRunUnirelmanPublish.mockResolvedValueOnce(PUBLISH_OUTPUT);

    await expect(runPublishStep(inputs, UNIRELMAN_ENVIRONMENT)).resolves.toEqual(undefined);

    expect(mockedRunUnirelmanPublish).toHaveBeenCalledTimes(1);
    expect(mockedRunUnirelmanPublish).toHaveBeenNthCalledWith(
      1,
      "npx --no-install unirelman",
      "/workspace",
      UNIRELMAN_ENVIRONMENT,
    );
    expect(mockedResolvePublishedGitTags).toHaveBeenCalledTimes(1);
    expect(mockedResolvePublishedGitTags).toHaveBeenNthCalledWith(1, PUBLISH_OUTPUT);
    expect(mockedPushGitTags).toHaveBeenCalledTimes(1);
    expect(mockedPushGitTags).toHaveBeenNthCalledWith(1, inputs.workingDirectory, [
      "@scope/a@1.0.0",
    ]);
    expect(mockedSetOutput).toHaveBeenCalledTimes(1);
    expect(mockedSetOutput).toHaveBeenNthCalledWith(
      1,
      "releases",
      '{"@scope/a":[{"type":"git-tag","name":"@scope/a@1.0.0","status":"existing","meta":{}}]}',
    );
  });
});

describe("runVersionStep", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should version on the release branch and return the version output", async () => {
    const inputs = createActionInputs();

    mockedReadHeadCommit.mockResolvedValueOnce("base").mockResolvedValueOnce("release");
    mockedRunUnirelmanVersion.mockResolvedValueOnce(VERSION_OUTPUT);

    await expect(runVersionStep(inputs, UNIRELMAN_ENVIRONMENT)).resolves.toEqual(VERSION_OUTPUT);

    expect(mockedCheckoutBranch).toHaveBeenCalledTimes(1);
    expect(mockedCheckoutBranch).toHaveBeenNthCalledWith(
      1,
      inputs.workingDirectory,
      "unirelman/release",
    );
    expect(mockedRunUnirelmanVersion).toHaveBeenCalledTimes(1);
    expect(mockedRunUnirelmanVersion).toHaveBeenNthCalledWith(
      1,
      "npx --no-install unirelman",
      "/workspace",
      UNIRELMAN_ENVIRONMENT,
    );
    expect(mockedReadHeadCommit).toHaveBeenCalledTimes(2);
    expect(mockedReadHeadCommit).toHaveBeenNthCalledWith(1, inputs.workingDirectory);
    expect(mockedReadHeadCommit).toHaveBeenNthCalledWith(2, inputs.workingDirectory);
  });

  it("should not compare commits when the version pipeline changed no file", async () => {
    mockedReadHeadCommit.mockResolvedValueOnce("base");
    mockedRunUnirelmanVersion.mockResolvedValueOnce(EMPTY_VERSION_OUTPUT);

    await expect(runVersionStep(createActionInputs(), UNIRELMAN_ENVIRONMENT)).resolves.toEqual(
      EMPTY_VERSION_OUTPUT,
    );

    expect(mockedReadHeadCommit).toHaveBeenCalledTimes(1);
  });

  it("should throw when the version pipeline changed files without committing", async () => {
    mockedReadHeadCommit.mockResolvedValueOnce("base").mockResolvedValueOnce("base");
    mockedRunUnirelmanVersion.mockResolvedValueOnce(VERSION_OUTPUT);

    await expect(runVersionStep(createActionInputs(), UNIRELMAN_ENVIRONMENT)).rejects.toThrow(
      new ActionMissingReleaseCommitError(),
    );
  });
});

describe("syncReleasePullRequest", () => {
  const octokit = {} as GitHubClient;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should push the release branch and update the release pull request", async () => {
    const inputs = createActionInputs();
    const store = new MockedStore("/workspace");

    mockedFindReleasePullRequest.mockResolvedValueOnce(42);
    mockedUpsertReleasePullRequest.mockResolvedValueOnce(42);

    await expect(
      syncReleasePullRequest(
        octokit,
        REPOSITORY,
        inputs,
        store,
        { publishingEnabled: true },
        VERSION_OUTPUT,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedFindReleasePullRequest).toHaveBeenCalledTimes(1);
    expect(mockedFindReleasePullRequest).toHaveBeenNthCalledWith(1, octokit, REPOSITORY, inputs);
    expect(mockedWriteActionSettings).not.toHaveBeenCalled();
    expect(mockedCommitFiles).not.toHaveBeenCalled();
    expect(mockedPushBranch).toHaveBeenCalledTimes(1);
    expect(mockedPushBranch).toHaveBeenNthCalledWith(
      1,
      inputs.workingDirectory,
      "unirelman/release",
    );
    expect(mockedFormatReleasePullRequestBody).toHaveBeenCalledTimes(1);
    expect(mockedFormatReleasePullRequestBody).toHaveBeenNthCalledWith(1, VERSION_OUTPUT);
    expect(mockedUpsertReleasePullRequest).toHaveBeenCalledTimes(1);
    expect(mockedUpsertReleasePullRequest).toHaveBeenNthCalledWith(
      1,
      octokit,
      REPOSITORY,
      inputs,
      42,
      "chore(release): bump versions",
      "## Releases\n\n- `@scope/a`: 1.0.0 → 1.0.1",
    );
    expect(mockedSetOutput).toHaveBeenCalledTimes(1);
    expect(mockedSetOutput).toHaveBeenNthCalledWith(1, "pr-number", "42");
    expect(mockedInfo).toHaveBeenCalledTimes(1);
    expect(mockedInfo).toHaveBeenNthCalledWith(1, "Updated release pull request #42");
    expect(mockedCloseReleasePullRequest).not.toHaveBeenCalled();
  });

  it("should enable publishing in the release pull request while publishing is disabled", async () => {
    const inputs = createActionInputs();
    const store = new MockedStore("/workspace");

    mockedFindReleasePullRequest.mockResolvedValueOnce(undefined);
    mockedResolveActionSettingsPath.mockReturnValueOnce(SETTINGS_PATH);
    mockedUpsertReleasePullRequest.mockResolvedValueOnce(1);

    await expect(
      syncReleasePullRequest(
        octokit,
        REPOSITORY,
        inputs,
        store,
        { publishingEnabled: false },
        VERSION_OUTPUT,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedWriteActionSettings).toHaveBeenCalledTimes(1);
    expect(mockedWriteActionSettings).toHaveBeenNthCalledWith(1, store, {
      publishingEnabled: true,
    });
    expect(mockedResolveActionSettingsPath).toHaveBeenCalledTimes(1);
    expect(mockedResolveActionSettingsPath).toHaveBeenNthCalledWith(1, store);
    expect(mockedCommitFiles).toHaveBeenCalledTimes(1);
    expect(mockedCommitFiles).toHaveBeenNthCalledWith(
      1,
      inputs.workingDirectory,
      [SETTINGS_PATH],
      "chore(release): enable publishing",
    );
    expect(mockedPushBranch).toHaveBeenCalledTimes(1);
    expect(mockedUpsertReleasePullRequest).toHaveBeenCalledTimes(1);
    expect(mockedUpsertReleasePullRequest).toHaveBeenNthCalledWith(
      1,
      octokit,
      REPOSITORY,
      inputs,
      undefined,
      "chore(release): bump versions",
      "## Releases\n\n- `@scope/a`: 1.0.0 → 1.0.1",
    );
    expect(mockedSetOutput).toHaveBeenCalledTimes(1);
    expect(mockedSetOutput).toHaveBeenNthCalledWith(1, "pr-number", "1");
  });

  it("should open the release pull request enabling publishing when nothing is pending while publishing is disabled", async () => {
    const inputs = createActionInputs();
    const store = new MockedStore("/workspace");

    mockedFindReleasePullRequest.mockResolvedValueOnce(undefined);
    mockedResolveActionSettingsPath.mockReturnValueOnce(SETTINGS_PATH);
    mockedUpsertReleasePullRequest.mockResolvedValueOnce(1);

    await expect(
      syncReleasePullRequest(
        octokit,
        REPOSITORY,
        inputs,
        store,
        { publishingEnabled: false },
        EMPTY_VERSION_OUTPUT,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedCloseReleasePullRequest).not.toHaveBeenCalled();
    expect(mockedFormatReleasePullRequestBody).not.toHaveBeenCalled();
    expect(mockedUpsertReleasePullRequest).toHaveBeenCalledTimes(1);
    expect(mockedUpsertReleasePullRequest).toHaveBeenNthCalledWith(
      1,
      octokit,
      REPOSITORY,
      inputs,
      undefined,
      "chore(release): enable publishing",
      "Merging this pull request enables publishing: the next run publishes the current version of every scope that is not published yet.",
    );
  });

  it("should close the release pull request when nothing is left to release", async () => {
    const store = new MockedStore("/workspace");

    mockedFindReleasePullRequest.mockResolvedValueOnce(42);

    await expect(
      syncReleasePullRequest(
        octokit,
        REPOSITORY,
        createActionInputs(),
        store,
        { publishingEnabled: true },
        EMPTY_VERSION_OUTPUT,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedCloseReleasePullRequest).toHaveBeenCalledTimes(1);
    expect(mockedCloseReleasePullRequest).toHaveBeenNthCalledWith(1, octokit, REPOSITORY, 42);
    expect(mockedInfo).toHaveBeenCalledTimes(1);
    expect(mockedInfo).toHaveBeenNthCalledWith(
      1,
      "Closed release pull request #42: nothing left to release",
    );
    expect(mockedPushBranch).not.toHaveBeenCalled();
    expect(mockedUpsertReleasePullRequest).not.toHaveBeenCalled();
  });

  it("should do nothing more when nothing is left to release and no pull request is open", async () => {
    const store = new MockedStore("/workspace");

    mockedFindReleasePullRequest.mockResolvedValueOnce(undefined);

    await expect(
      syncReleasePullRequest(
        octokit,
        REPOSITORY,
        createActionInputs(),
        store,
        { publishingEnabled: true },
        EMPTY_VERSION_OUTPUT,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedCloseReleasePullRequest).not.toHaveBeenCalled();
    expect(mockedPushBranch).not.toHaveBeenCalled();
    expect(mockedUpsertReleasePullRequest).not.toHaveBeenCalled();
    expect(mockedInfo).not.toHaveBeenCalled();
  });
});

describe("runAction", () => {
  const runPublishStepSpy = vi.spyOn(thisMod, "runPublishStep");
  const runVersionStepSpy = vi.spyOn(thisMod, "runVersionStep");
  const syncReleasePullRequestSpy = vi.spyOn(thisMod, "syncReleasePullRequest");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish, version, then sync the release pull request", async () => {
    const inputs = createActionInputs();

    mockedReadActionInputs.mockReturnValueOnce(inputs);
    mockedResolveUnirelmanEnvironment.mockReturnValueOnce(UNIRELMAN_ENVIRONMENT);
    mockedReadActionSettings.mockResolvedValueOnce({ publishingEnabled: true });
    runPublishStepSpy.mockResolvedValueOnce(undefined);
    runVersionStepSpy.mockResolvedValueOnce(VERSION_OUTPUT);
    syncReleasePullRequestSpy.mockResolvedValueOnce(undefined);

    await expect(runAction()).resolves.toEqual(undefined);

    const octokit = mockedGetOctokit.mock.results[0]?.value;
    const store = MockedStore.mock.instances[0];

    expect(mockedGetOctokit).toHaveBeenCalledTimes(1);
    expect(mockedGetOctokit).toHaveBeenNthCalledWith(1, "token");
    expect(mockedResolveUnirelmanEnvironment).toHaveBeenCalledTimes(1);
    expect(mockedResolveUnirelmanEnvironment).toHaveBeenNthCalledWith(1, process.env, "token");
    expect(MockedStore).toHaveBeenCalledTimes(1);
    expect(MockedStore).toHaveBeenNthCalledWith(1, "/workspace", "github-action");
    expect(mockedReadActionSettings).toHaveBeenCalledTimes(1);
    expect(mockedReadActionSettings).toHaveBeenNthCalledWith(1, store);
    expect(mockedConfigureGitIdentity).toHaveBeenCalledTimes(1);
    expect(mockedConfigureGitIdentity).toHaveBeenNthCalledWith(1, inputs.workingDirectory);
    expect(runPublishStepSpy).toHaveBeenCalledTimes(1);
    expect(runPublishStepSpy).toHaveBeenNthCalledWith(1, inputs, UNIRELMAN_ENVIRONMENT);
    expect(runVersionStepSpy).toHaveBeenCalledTimes(1);
    expect(runVersionStepSpy).toHaveBeenNthCalledWith(1, inputs, UNIRELMAN_ENVIRONMENT);
    expect(syncReleasePullRequestSpy).toHaveBeenCalledTimes(1);
    expect(syncReleasePullRequestSpy).toHaveBeenNthCalledWith(
      1,
      octokit,
      REPOSITORY,
      inputs,
      store,
      { publishingEnabled: true },
      VERSION_OUTPUT,
    );
    expect(mockedInfo).not.toHaveBeenCalled();
  });

  it("should skip publishing while publishing is disabled", async () => {
    mockedReadActionInputs.mockReturnValueOnce(createActionInputs());
    mockedResolveUnirelmanEnvironment.mockReturnValueOnce(UNIRELMAN_ENVIRONMENT);
    mockedReadActionSettings.mockResolvedValueOnce({ publishingEnabled: false });
    runVersionStepSpy.mockResolvedValueOnce(VERSION_OUTPUT);
    syncReleasePullRequestSpy.mockResolvedValueOnce(undefined);

    await expect(runAction()).resolves.toEqual(undefined);

    expect(runPublishStepSpy).not.toHaveBeenCalled();
    expect(mockedInfo).toHaveBeenCalledTimes(1);
    expect(mockedInfo).toHaveBeenNthCalledWith(
      1,
      "Skipped publish: publishing is enabled by merging the release pull request",
    );
    expect(runVersionStepSpy).toHaveBeenCalledTimes(1);
    expect(syncReleasePullRequestSpy).toHaveBeenCalledTimes(1);
  });
});
