import { describe } from "vitest";

import type { GitHubAction } from "../lib/github-action.ts";
import type { Workspace } from "../lib/workspace.ts";

import { createChangeset } from "../lib/commands.ts";
import { DEFAULT_BRANCH, RELEASE_BRANCH } from "../lib/constants.ts";
import {
  CORE_PACKAGE,
  MONOREPO_SCOPES,
  SEMVER_PRERELEASE_OPTIONS,
  UI_PACKAGE,
} from "../lib/presets.ts";
import { test } from "../lib/test.ts";

const pushChangeset = async (
  workspace: Workspace,
  scopes: readonly string[],
  level: "patch" | "minor" | "major",
  message: string,
): Promise<void> => {
  await createChangeset(workspace, { scopes, level, message });
  await workspace.git.commit("chore: add changeset");
  await workspace.git.push("origin", DEFAULT_BRANCH);
};

const mergeReleasePullRequest = async (workspace: Workspace): Promise<void> => {
  await workspace.git.checkout(DEFAULT_BRANCH);
  await workspace.git.merge(RELEASE_BRANCH);
  await workspace.git.push("origin", DEFAULT_BRANCH);
};

const runAndRead = async (
  githubAction: GitHubAction,
  github: { readPullRequests: () => unknown; readReleases: () => unknown },
  npm: { readPackages: () => unknown },
) => {
  return {
    result: await githubAction.run(),
    remote: await githubAction.readRemote(),
    pullRequests: github.readPullRequests(),
    releases: github.readReleases(),
    packages: npm.readPackages(),
  };
};

describe.concurrent("github-action", () => {
  describe("single package", () => {
    test("should open the release pull request, then publish the merged release", async ({
      expect,
      workspace,
      github,
      npm,
      githubAction,
    }) => {
      await pushChangeset(workspace, ["example"], "patch", "fix a bug");

      const versionRun = await runAndRead(githubAction, github, npm);

      await mergeReleasePullRequest(workspace);

      const publishRun = await runAndRead(githubAction, github, npm);

      expect({ versionRun, publishRun }).toMatchSnapshot();
    });

    test("should update the open release pull request with new changes", async ({
      expect,
      workspace,
      github,
      githubAction,
    }) => {
      await pushChangeset(workspace, ["example"], "patch", "fix a bug");
      await githubAction.run();
      await workspace.git.checkout(DEFAULT_BRANCH);
      await pushChangeset(workspace, ["example"], "minor", "add a feature");

      expect({
        result: await githubAction.run(),
        remote: await githubAction.readRemote(),
        pullRequests: github.readPullRequests(),
      }).toMatchSnapshot();
    });

    test("should open a pull request enabling publishing, then publish current versions once merged", async ({
      expect,
      workspace,
      github,
      npm,
      githubAction,
    }) => {
      const enablePublishingRun = await runAndRead(githubAction, github, npm);

      await mergeReleasePullRequest(workspace);

      const publishRun = await runAndRead(githubAction, github, npm);

      expect({ enablePublishingRun, publishRun }).toMatchSnapshot();
    });
  });

  describe("root scope", () => {
    test.override({
      workspaceSpec: {
        packages: [
          { path: ".", name: "example", version: "1.0.0" },
          CORE_PACKAGE,
          { ...UI_PACKAGE, version: "2026.01.01.0", private: true },
        ],
        config: {
          scopes: { root: "./", ...MONOREPO_SCOPES },
          plugins: [
            { name: "changesets" },
            { name: "changelog", options: '{ mode: "scope" }' },
            { name: "npm" },
            { name: "git" },
            { name: "github" },
            {
              name: "semver",
              options: SEMVER_PRERELEASE_OPTIONS,
              scopes: ["root", "@example/core"],
            },
            { name: "calver", options: SEMVER_PRERELEASE_OPTIONS, scopes: ["@example/ui"] },
          ],
        },
      },
    });

    test("should open the release pull request, then publish the merged release", async ({
      expect,
      workspace,
      github,
      npm,
      githubAction,
    }) => {
      await pushChangeset(workspace, ["root", "@example/core"], "minor", "add a feature");
      await githubAction.run();
      await mergeReleasePullRequest(workspace);

      expect(await runAndRead(githubAction, github, npm)).toMatchSnapshot();
    });
  });

  describe("fixed scopes", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, UI_PACKAGE],
        config: {
          scopes: MONOREPO_SCOPES,
          plugins: [
            { name: "changesets" },
            { name: "changelog", options: '{ mode: "scope" }' },
            { name: "npm" },
            { name: "git" },
            { name: "github" },
            { name: "semver", options: "{ fixed: true }" },
          ],
        },
      },
    });

    test("should release every fixed scope through the release pull request", async ({
      expect,
      workspace,
      github,
      npm,
      githubAction,
    }) => {
      await pushChangeset(workspace, ["@example/core"], "minor", "add a feature");

      const versionRun = await githubAction.run();

      expect(versionRun.outputs["pr-number"]).toEqual("1");
      expect((await githubAction.readRemote()).branches).toEqual([DEFAULT_BRANCH, RELEASE_BRANCH]);

      await mergeReleasePullRequest(workspace);
      await githubAction.run();

      expect((await githubAction.readRemote()).tags).toEqual([
        "@example/core@1.1.0",
        "@example/ui@1.1.0",
      ]);
      expect(github.readReleases().map((release) => release.tag_name)).toEqual([
        "@example/core@1.1.0",
        "@example/ui@1.1.0",
      ]);
      expect(npm.readPackages()).toEqual({
        "@example/core": { distTags: { latest: "1.1.0" }, versions: ["1.1.0"] },
        "@example/ui": { distTags: { latest: "1.1.0" }, versions: ["1.1.0"] },
      });
    });
  });
});
