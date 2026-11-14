import type { Octokit } from "@octokit/rest";

import { RequestError } from "@octokit/request-error";
import {
  CONFIG_CWD,
  createPhaseContext,
  createCreateReleasesState,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { mockedResolveGitTag } from "@unirelman/helpers/git/testing/mock";
import { MockedOctokit } from "@unirelman/testing/mocks/octokit/rest";
import { mockedExecCommand } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GitHubInvalidRepositoryError,
  GitHubMissingOptionError,
  GitHubUnknownLatestScopeError,
} from "../errors";
import {
  createGitHubRelease,
  createCreateReleasesPhase,
  listGitHubDraftReleases,
  findGitHubRelease,
  isGitHubReleaseDraft,
  isGitHubReleaseLatest,
  parseGitHubRepository,
  resolveGitHubRelease,
  readHeadCommit,
} from "./create-releases";
import * as thisMod from "./create-releases";

type ReleaseResponse = Awaited<ReturnType<Octokit["rest"]["repos"]["getReleaseByTag"]>>;
type CreateReleaseResponse = Awaited<ReturnType<Octokit["rest"]["repos"]["createRelease"]>>;
type ListReleasesData = Awaited<ReturnType<Octokit["rest"]["repos"]["listReleases"]>>["data"];

const REPOSITORY = { owner: "owner", repo: "repo" };
const RELEASE_RESPONSE = {
  id: 42,
  html_url: "https://github.com/owner/repo/releases/tag/1.0.0",
  upload_url: "https://uploads.github.com/repos/owner/repo/releases/42/assets{?name,label}",
};
const RELEASE = {
  id: 42,
  url: "https://github.com/owner/repo/releases/tag/1.0.0",
  uploadUrl: "https://uploads.github.com/repos/owner/repo/releases/42/assets{?name,label}",
};
const OPTIONS = {
  repository: "owner/repo",
  token: "token",
  apiUrl: "https://api.github.com",
  tagFormat: resolveDefaultGitTag,
  draft: false,
  makeLatest: true,
};

describe("parseGitHubRepository", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should split owner and repository name", () => {
    expect(parseGitHubRepository("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should throw when the repository has no name", () => {
    expect(() => parseGitHubRepository("owner")).toThrow(new GitHubInvalidRepositoryError("owner"));
  });

  it("should throw when the repository has an empty owner", () => {
    expect(() => parseGitHubRepository("/repo")).toThrow(new GitHubInvalidRepositoryError("/repo"));
  });

  it("should throw when the repository has extra segments", () => {
    expect(() => parseGitHubRepository("owner/repo/extra")).toThrow(
      new GitHubInvalidRepositoryError("owner/repo/extra"),
    );
  });
});

describe("readHeadCommit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the trimmed HEAD commit", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: "abc123\n", stderr: "" });

    await expect(readHeadCommit(CONFIG_CWD)).resolves.toEqual("abc123");
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["rev-parse", "HEAD"], {
      cwd: CONFIG_CWD,
    });
  });
});

describe("resolveGitHubRelease", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should map the release response to its id and URLs", () => {
    expect(resolveGitHubRelease(RELEASE_RESPONSE)).toEqual(RELEASE);
  });
});

describe("listGitHubDraftReleases", () => {
  const resolveGitHubReleaseSpy = vi.spyOn(thisMod, "resolveGitHubRelease");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should map the tag of each draft release to the release", async () => {
    const octokit = new MockedOctokit();
    const draftResponse = { ...RELEASE_RESPONSE, draft: true, tag_name: "1.0.0" };

    vi.mocked(octokit.paginate).mockResolvedValueOnce([
      { ...RELEASE_RESPONSE, id: 41, draft: false, tag_name: "0.9.0" },
      draftResponse,
    ] as ListReleasesData);

    await expect(listGitHubDraftReleases(octokit, REPOSITORY)).resolves.toEqual(
      new Map([["1.0.0", RELEASE]]),
    );
    expect(octokit.paginate).toHaveBeenCalledTimes(1);
    expect(octokit.paginate).toHaveBeenNthCalledWith(1, octokit.rest.repos.listReleases, {
      owner: "owner",
      repo: "repo",
      per_page: 100,
    });
    expect(resolveGitHubReleaseSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitHubReleaseSpy).toHaveBeenNthCalledWith(1, draftResponse);
  });
});

describe("findGitHubRelease", () => {
  const resolveGitHubReleaseSpy = vi.spyOn(thisMod, "resolveGitHubRelease");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the release when it exists", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.getReleaseByTag).mockResolvedValueOnce({
      data: RELEASE_RESPONSE,
    } as ReleaseResponse);

    const readDraftReleases = vi.fn();

    await expect(
      findGitHubRelease(octokit, REPOSITORY, "1.0.0", readDraftReleases),
    ).resolves.toEqual(RELEASE);
    expect(readDraftReleases).not.toHaveBeenCalled();
    expect(octokit.rest.repos.getReleaseByTag).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getReleaseByTag).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      tag: "1.0.0",
    });
    expect(resolveGitHubReleaseSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitHubReleaseSpy).toHaveBeenNthCalledWith(1, RELEASE_RESPONSE);
  });

  it("should look for a draft release when no published release has the tag", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.getReleaseByTag).mockRejectedValueOnce(
      new RequestError("Not Found", 404, {
        request: { method: "GET", url: "https://api.github.com", headers: {} },
      }),
    );

    const readDraftReleases = vi.fn().mockResolvedValueOnce(new Map([["1.0.0", RELEASE]]));

    await expect(
      findGitHubRelease(octokit, REPOSITORY, "1.0.0", readDraftReleases),
    ).resolves.toEqual(RELEASE);
    expect(readDraftReleases).toHaveBeenCalledTimes(1);
    expect(resolveGitHubReleaseSpy).not.toHaveBeenCalled();
  });

  it("should rethrow request errors other than not found", async () => {
    const octokit = new MockedOctokit();
    const error = new RequestError("Unauthorized", 401, {
      request: { method: "GET", url: "https://api.github.com", headers: {} },
    });

    vi.mocked(octokit.rest.repos.getReleaseByTag).mockRejectedValueOnce(error);

    await expect(findGitHubRelease(octokit, REPOSITORY, "1.0.0", vi.fn())).rejects.toThrow(error);
  });

  it("should rethrow errors that are not request errors", async () => {
    const octokit = new MockedOctokit();
    const error = new Error("network failure");

    vi.mocked(octokit.rest.repos.getReleaseByTag).mockRejectedValueOnce(error);

    await expect(findGitHubRelease(octokit, REPOSITORY, "1.0.0", vi.fn())).rejects.toThrow(error);
  });
});

describe("isGitHubReleaseDraft", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the option when it is a boolean", () => {
    expect(isGitHubReleaseDraft(true, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" })).toEqual(
      true,
    );
  });

  it("should return the result of the option when it is a function", () => {
    const draft = vi.fn().mockReturnValueOnce(true);

    expect(isGitHubReleaseDraft(draft, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" })).toEqual(
      true,
    );
    expect(draft).toHaveBeenCalledTimes(1);
    expect(draft).toHaveBeenNthCalledWith(1, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" });
  });
});

describe("isGitHubReleaseLatest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the option when it is a boolean", () => {
    expect(
      isGitHubReleaseLatest(false, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" }),
    ).toEqual(false);
  });

  it("should return true for the scope named by the option", () => {
    expect(
      isGitHubReleaseLatest(SCOPE_NAMES.ALPHA, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" }),
    ).toEqual(true);
  });

  it("should return false for a scope other than the one named by the option", () => {
    expect(
      isGitHubReleaseLatest(SCOPE_NAMES.ALPHA, { scopeName: SCOPE_NAMES.BETA, version: "1.0.0" }),
    ).toEqual(false);
  });

  it("should return the result of the option when it is a function", () => {
    const makeLatest = vi.fn().mockReturnValueOnce(true);

    expect(
      isGitHubReleaseLatest(makeLatest, { scopeName: SCOPE_NAMES.ALPHA, version: "1.0.0" }),
    ).toEqual(true);
    expect(makeLatest).toHaveBeenCalledTimes(1);
    expect(makeLatest).toHaveBeenNthCalledWith(1, {
      scopeName: SCOPE_NAMES.ALPHA,
      version: "1.0.0",
    });
  });
});

describe("createGitHubRelease", () => {
  const resolveGitHubReleaseSpy = vi.spyOn(thisMod, "resolveGitHubRelease");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a release named after the tag on the given commit with the body", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.createRelease).mockResolvedValueOnce({
      data: RELEASE_RESPONSE,
    } as CreateReleaseResponse);

    await expect(
      createGitHubRelease(octokit, REPOSITORY, {
        tag: "1.0.0",
        commit: "abc123",
        body: "### Patch changes\n- fix a bug",
        prerelease: undefined,
        draft: false,
        latest: true,
      }),
    ).resolves.toEqual(RELEASE);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createRelease).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      tag_name: "1.0.0",
      name: "1.0.0",
      target_commitish: "abc123",
      body: "### Patch changes\n- fix a bug",
      prerelease: false,
      draft: false,
      make_latest: "true",
    });
    expect(resolveGitHubReleaseSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitHubReleaseSpy).toHaveBeenNthCalledWith(1, RELEASE_RESPONSE);
  });

  it("should never make a draft release the latest", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.createRelease).mockResolvedValueOnce({
      data: RELEASE_RESPONSE,
    } as CreateReleaseResponse);

    await expect(
      createGitHubRelease(octokit, REPOSITORY, {
        tag: "1.0.0",
        commit: "abc123",
        body: "",
        prerelease: undefined,
        draft: true,
        latest: true,
      }),
    ).resolves.toEqual(RELEASE);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createRelease).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      tag_name: "1.0.0",
      name: "1.0.0",
      target_commitish: "abc123",
      body: "",
      prerelease: false,
      draft: true,
      make_latest: "false",
    });
  });

  it("should create a draft release that is not the latest", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.createRelease).mockResolvedValueOnce({
      data: RELEASE_RESPONSE,
    } as CreateReleaseResponse);

    await expect(
      createGitHubRelease(octokit, REPOSITORY, {
        tag: "1.0.0",
        commit: "abc123",
        body: "",
        prerelease: undefined,
        draft: true,
        latest: false,
      }),
    ).resolves.toEqual(RELEASE);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createRelease).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      tag_name: "1.0.0",
      name: "1.0.0",
      target_commitish: "abc123",
      body: "",
      prerelease: false,
      draft: true,
      make_latest: "false",
    });
  });

  it("should mark a prerelease version as a prerelease that is not the latest", async () => {
    const octokit = new MockedOctokit();

    vi.mocked(octokit.rest.repos.createRelease).mockResolvedValueOnce({
      data: RELEASE_RESPONSE,
    } as CreateReleaseResponse);

    await expect(
      createGitHubRelease(octokit, REPOSITORY, {
        tag: "1.1.0-alpha.0",
        commit: "abc123",
        body: "",
        prerelease: { channel: "alpha", increment: 0 },
        draft: false,
        latest: true,
      }),
    ).resolves.toEqual(RELEASE);
    expect(octokit.rest.repos.createRelease).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repo",
      tag_name: "1.1.0-alpha.0",
      name: "1.1.0-alpha.0",
      target_commitish: "abc123",
      body: "",
      prerelease: true,
      draft: false,
      make_latest: "false",
    });
  });
});

describe("createCreateReleasesPhase", () => {
  const parseGitHubRepositorySpy = vi.spyOn(thisMod, "parseGitHubRepository");
  const readHeadCommitSpy = vi.spyOn(thisMod, "readHeadCommit");
  const findGitHubReleaseSpy = vi.spyOn(thisMod, "findGitHubRelease");
  const listGitHubDraftReleasesSpy = vi.spyOn(thisMod, "listGitHubDraftReleases");
  const isGitHubReleaseDraftSpy = vi.spyOn(thisMod, "isGitHubReleaseDraft");
  const isGitHubReleaseLatestSpy = vi.spyOn(thisMod, "isGitHubReleaseLatest");
  const createGitHubReleaseSpy = vi.spyOn(thisMod, "createGitHubRelease");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create GitHub releases with their notes for current versions without a release", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
        [SCOPE_NAMES.BETA]: createVersion({
          extends: {
            version: "2.0.0-beta.0",
            meta: { prerelease: { channel: "beta", increment: 0 } },
          },
        }),
      },
      releaseNotes: { [SCOPE_NAMES.ALPHA]: "### Patch changes\n- fix a bug" },
    });

    readHeadCommitSpy.mockResolvedValueOnce("abc123");
    findGitHubReleaseSpy.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    createGitHubReleaseSpy
      .mockResolvedValueOnce(RELEASE)
      .mockResolvedValueOnce({ ...RELEASE, id: 43 });

    const phase = createCreateReleasesPhase(OPTIONS);

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "github-release",
          name: "@scope/a@1.0.1",
          status: "created",
          meta: { github: RELEASE },
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "github-release",
          name: "@scope/b@2.0.0-beta.0",
          status: "created",
          meta: { github: { ...RELEASE, id: 43 } },
        },
      ],
    });

    const octokit = MockedOctokit.mock.instances[0];

    expect(MockedOctokit).toHaveBeenCalledTimes(1);
    expect(MockedOctokit).toHaveBeenNthCalledWith(1, {
      auth: "token",
      baseUrl: "https://api.github.com",
    });
    expect(parseGitHubRepositorySpy).toHaveBeenCalledTimes(1);
    expect(parseGitHubRepositorySpy).toHaveBeenNthCalledWith(1, "owner/repo");
    expect(readHeadCommitSpy).toHaveBeenCalledTimes(1);
    expect(readHeadCommitSpy).toHaveBeenNthCalledWith(1, context.cwd);
    expect(mockedResolveGitTag).toHaveBeenCalledTimes(2);
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      1,
      context.scopes[SCOPE_NAMES.ALPHA],
      "1.0.1",
      context.cwd,
      resolveDefaultGitTag,
    );
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      2,
      context.scopes[SCOPE_NAMES.BETA],
      "2.0.0-beta.0",
      context.cwd,
      resolveDefaultGitTag,
    );

    const readDraftReleases = findGitHubReleaseSpy.mock.calls[0]?.[3];

    expect(findGitHubReleaseSpy).toHaveBeenCalledTimes(2);
    expect(findGitHubReleaseSpy).toHaveBeenNthCalledWith(
      1,
      octokit,
      REPOSITORY,
      "@scope/a@1.0.1",
      readDraftReleases,
    );
    expect(findGitHubReleaseSpy).toHaveBeenNthCalledWith(
      2,
      octokit,
      REPOSITORY,
      "@scope/b@2.0.0-beta.0",
      readDraftReleases,
    );
    expect(createGitHubReleaseSpy).toHaveBeenCalledTimes(2);
    expect(createGitHubReleaseSpy).toHaveBeenNthCalledWith(1, octokit, REPOSITORY, {
      tag: "@scope/a@1.0.1",
      commit: "abc123",
      body: "### Patch changes\n- fix a bug",
      prerelease: undefined,
      draft: false,
      latest: true,
    });
    expect(createGitHubReleaseSpy).toHaveBeenNthCalledWith(2, octokit, REPOSITORY, {
      tag: "@scope/b@2.0.0-beta.0",
      commit: "abc123",
      body: "",
      prerelease: { channel: "beta", increment: 0 },
      draft: false,
      latest: true,
    });
    expect(isGitHubReleaseDraftSpy).toHaveBeenCalledTimes(2);
    expect(isGitHubReleaseDraftSpy).toHaveBeenNthCalledWith(1, false, {
      scopeName: SCOPE_NAMES.ALPHA,
      version: "1.0.1",
    });
    expect(isGitHubReleaseDraftSpy).toHaveBeenNthCalledWith(2, false, {
      scopeName: SCOPE_NAMES.BETA,
      version: "2.0.0-beta.0",
    });
    expect(isGitHubReleaseLatestSpy).toHaveBeenCalledTimes(2);
    expect(isGitHubReleaseLatestSpy).toHaveBeenNthCalledWith(1, true, {
      scopeName: SCOPE_NAMES.ALPHA,
      version: "1.0.1",
    });
    expect(isGitHubReleaseLatestSpy).toHaveBeenNthCalledWith(2, true, {
      scopeName: SCOPE_NAMES.BETA,
      version: "2.0.0-beta.0",
    });
    expect(context.logger.info).toHaveBeenCalledTimes(2);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Created GitHub release: @scope/a@1.0.1",
    );
    expect(context.logger.info).toHaveBeenNthCalledWith(
      2,
      "Created GitHub release: @scope/b@2.0.0-beta.0",
    );
  });

  it("should list the draft releases once for every lookup of the run", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
      },
    });
    const draftReleases = new Map([["@scope/a@1.0.1", RELEASE]]);

    readHeadCommitSpy.mockResolvedValueOnce("abc123");
    findGitHubReleaseSpy.mockResolvedValueOnce(RELEASE);
    listGitHubDraftReleasesSpy.mockResolvedValueOnce(draftReleases);

    await createCreateReleasesPhase(OPTIONS)(context, state);

    const readDraftReleases = findGitHubReleaseSpy.mock.calls[0]?.[3] as () => Promise<
      ReadonlyMap<string, typeof RELEASE>
    >;
    const octokit = MockedOctokit.mock.instances[0];

    await expect(readDraftReleases()).resolves.toEqual(draftReleases);
    await expect(readDraftReleases()).resolves.toEqual(draftReleases);
    expect(listGitHubDraftReleasesSpy).toHaveBeenCalledTimes(1);
    expect(listGitHubDraftReleasesSpy).toHaveBeenNthCalledWith(1, octokit, REPOSITORY);
  });

  it("should skip scopes that are missing or without current version", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "" } }),
        [SCOPE_NAMES.MISSING]: createVersion({ extends: { version: "1.0.0" } }),
      },
    });

    readHeadCommitSpy.mockResolvedValueOnce("abc123");

    const phase = createCreateReleasesPhase(OPTIONS);

    await expect(phase(context, state)).resolves.toEqual({});
    expect(findGitHubReleaseSpy).not.toHaveBeenCalled();
    expect(createGitHubReleaseSpy).not.toHaveBeenCalled();
  });

  it("should skip GitHub releases that already exist", async () => {
    const context = createPhaseContext();
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
      },
    });

    readHeadCommitSpy.mockResolvedValueOnce("abc123");
    findGitHubReleaseSpy.mockResolvedValueOnce(RELEASE);

    const phase = createCreateReleasesPhase(OPTIONS);

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "github-release",
          name: "@scope/a@1.0.1",
          status: "existing",
          meta: { github: RELEASE },
        },
      ],
    });
    expect(createGitHubReleaseSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping GitHub release: @scope/a@1.0.1 already exists",
    );
  });

  it("should not create GitHub releases in dry-run mode", async () => {
    const context = createPhaseContext({ dryRun: true });
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
      },
    });

    readHeadCommitSpy.mockResolvedValueOnce("abc123");
    findGitHubReleaseSpy.mockResolvedValueOnce(undefined);

    const phase = createCreateReleasesPhase(OPTIONS);

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "github-release", name: "@scope/a@1.0.1", status: "created", meta: {} },
      ],
    });
    expect(createGitHubReleaseSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Would create GitHub release: @scope/a@1.0.1",
    );
  });

  it("should throw when the repository option is missing", async () => {
    const phase = createCreateReleasesPhase({ ...OPTIONS, repository: undefined });

    await expect(phase(createPhaseContext(), createCreateReleasesState())).rejects.toThrow(
      new GitHubMissingOptionError("repository", ["GITHUB_REPOSITORY"]),
    );
    expect(MockedOctokit).not.toHaveBeenCalled();
  });

  it("should throw when the token option is missing", async () => {
    const phase = createCreateReleasesPhase({ ...OPTIONS, token: undefined });

    await expect(phase(createPhaseContext(), createCreateReleasesState())).rejects.toThrow(
      new GitHubMissingOptionError("token", ["GITHUB_TOKEN", "GH_TOKEN"]),
    );
    expect(MockedOctokit).not.toHaveBeenCalled();
  });

  it("should throw when the makeLatest scope is not a scope of the plugin", async () => {
    const phase = createCreateReleasesPhase({ ...OPTIONS, makeLatest: SCOPE_NAMES.MISSING });

    await expect(phase(createPhaseContext(), createCreateReleasesState())).rejects.toThrow(
      new GitHubUnknownLatestScopeError(SCOPE_NAMES.MISSING),
    );
    expect(MockedOctokit).not.toHaveBeenCalled();
  });
});
