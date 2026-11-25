import type { getOctokit } from "@actions/github";

import { mockedGetOctokit } from "@unirelman/testing/mocks/actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  closeReleasePullRequest,
  findReleasePullRequest,
  formatReleasePullRequestBody,
  upsertReleasePullRequest,
} from "./pull-request";
import { createActionInputs } from "./types.fixture";

type GitHubClient = ReturnType<typeof getOctokit>;
type ListResponse = Awaited<ReturnType<GitHubClient["rest"]["pulls"]["list"]>>;
type CreateResponse = Awaited<ReturnType<GitHubClient["rest"]["pulls"]["create"]>>;
type UpdateResponse = Awaited<ReturnType<GitHubClient["rest"]["pulls"]["update"]>>;

const REPOSITORY = { owner: "owner", repo: "repo" };

describe("formatReleasePullRequestBody", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should list the version change of every scope", () => {
    expect(
      formatReleasePullRequestBody({
        pipeline: "version",
        dryRun: false,
        scopes: new Map([
          ["@scope/a", { currentVersion: "1.0.0", nextVersion: "1.0.1" }],
          ["@scope/b", { currentVersion: null, nextVersion: "1.0.0" }],
        ]),
        files: [],
      }),
    ).toEqual("## Releases\n\n- `@scope/a`: 1.0.0 → 1.0.1\n- `@scope/b`: none → 1.0.0");
  });
});

describe("findReleasePullRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the number of the open release pull request", async () => {
    const octokit = mockedGetOctokit("token");

    vi.mocked(octokit.rest.pulls.list).mockResolvedValueOnce({
      data: [{ number: 42 }],
    } as ListResponse);

    await expect(
      findReleasePullRequest(octokit, REPOSITORY, createActionInputs()),
    ).resolves.toEqual(42);
    expect(octokit.rest.pulls.list).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.list).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      state: "open",
      head: "owner:unirelman/release",
      base: "main",
    });
  });

  it("should return undefined when no release pull request is open", async () => {
    const octokit = mockedGetOctokit("token");

    vi.mocked(octokit.rest.pulls.list).mockResolvedValueOnce({
      data: [] as ListResponse["data"],
    } as ListResponse);

    await expect(
      findReleasePullRequest(octokit, REPOSITORY, createActionInputs()),
    ).resolves.toEqual(undefined);
  });
});

describe("upsertReleasePullRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should update the existing release pull request", async () => {
    const octokit = mockedGetOctokit("token");

    vi.mocked(octokit.rest.pulls.update).mockResolvedValueOnce({} as UpdateResponse);

    await expect(
      upsertReleasePullRequest(
        octokit,
        REPOSITORY,
        createActionInputs(),
        42,
        "chore(release): bump versions",
        "body",
      ),
    ).resolves.toEqual(42);
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.update).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      pull_number: 42,
      title: "chore(release): bump versions",
      body: "body",
    });
    expect(octokit.rest.pulls.create).not.toHaveBeenCalled();
  });

  it("should create the release pull request when none is open", async () => {
    const octokit = mockedGetOctokit("token");

    vi.mocked(octokit.rest.pulls.create).mockResolvedValueOnce({
      data: { number: 43 },
    } as CreateResponse);

    await expect(
      upsertReleasePullRequest(
        octokit,
        REPOSITORY,
        createActionInputs(),
        undefined,
        "chore(release): bump versions",
        "body",
      ),
    ).resolves.toEqual(43);
    expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.create).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      head: "unirelman/release",
      base: "main",
      title: "chore(release): bump versions",
      body: "body",
    });
    expect(octokit.rest.pulls.update).not.toHaveBeenCalled();
  });
});

describe("closeReleasePullRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should close the release pull request", async () => {
    const octokit = mockedGetOctokit("token");

    vi.mocked(octokit.rest.pulls.update).mockResolvedValueOnce({} as UpdateResponse);

    await expect(closeReleasePullRequest(octokit, REPOSITORY, 42)).resolves.toEqual(undefined);
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.update).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      pull_number: 42,
      state: "closed",
    });
  });
});
