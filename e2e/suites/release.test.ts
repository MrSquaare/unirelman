import { describe } from "vitest";

import { createChangeset } from "../lib/commands.ts";
import { readChangelog, readPackageVersion } from "../lib/readers.ts";
import { test } from "../lib/test.ts";

describe.concurrent("release", () => {
  test("should version then publish a patch change", async ({ expect, workspace, github, npm }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.release();

    expect({
      history: await workspace.git.readHistory(workspace.initialCommit),
      releases: github.readReleases(),
      packages: npm.readPackages(),
    }).toMatchSnapshot();
  });

  test("should release the highest level of pending changesets", async ({ expect, workspace }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await createChangeset(workspace, {
      scopes: ["example"],
      level: "minor",
      message: "add a feature",
    });
    await workspace.release();

    expect(await readPackageVersion(workspace.git, ".")).toEqual("1.1.0");
    expect(await readChangelog(workspace.git, ".")).toEqual(
      "# Changelog\n\n## example - 1.1.0\n\n### Minor changes\n\n- add a feature\n\n### Patch changes\n\n- fix a bug\n",
    );
    expect(await workspace.git.readTags()).toEqual(["1.1.0"]);
  });

  test("should publish the current version without pending changesets", async ({
    expect,
    workspace,
    npm,
  }) => {
    await workspace.release();

    expect(await workspace.git.readCommitMessages(workspace.initialCommit)).toEqual([]);
    expect(await workspace.git.readTags()).toEqual(["1.0.0"]);
    expect(npm.readPackages()).toEqual({
      example: { distTags: { latest: "1.0.0" }, versions: ["1.0.0"] },
    });
  });

  test("should leave the repository and the registries unchanged on dry run", async ({
    expect,
    workspace,
    github,
    npm,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.runCLI(["version", "--dry-run"]);
    await workspace.runCLI(["publish", "--dry-run"]);

    expect(await workspace.git.readCommitMessages(workspace.initialCommit)).toEqual([]);
    expect(await workspace.git.readTags()).toEqual([]);
    expect(await workspace.git.readStatus()).toEqual("?? .unirelman/\n");
    expect(github.readReleases()).toEqual([]);
    expect(npm.readPackages()).toEqual({});
  });

  test("should leave everything unchanged when publishing again", async ({
    expect,
    workspace,
    github,
    npm,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.release();

    const history = await workspace.git.readHistory(workspace.initialCommit);
    const releases = github.readReleases();
    const packages = npm.readPackages();

    await workspace.runCLI(["publish"]);

    expect(await workspace.git.readHistory(workspace.initialCommit)).toEqual(history);
    expect(github.readReleases()).toEqual(releases);
    expect(npm.readPackages()).toEqual(packages);
  });

  test("should complete a publish that failed partway when publishing again", async ({
    expect,
    workspace,
    github,
    npm,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.runCLI(["version"]);

    npm.revokeToken();
    await workspace.runCLI(["publish"], { exitCode: 1 });

    expect(npm.readPackages()).toEqual({});
    expect(await workspace.git.readTags()).toEqual([]);

    npm.restoreToken();
    await workspace.runCLI(["publish"]);

    expect(npm.readPackages()).toEqual({
      example: { distTags: { latest: "1.0.1" }, versions: ["1.0.1"] },
    });
    expect(await workspace.git.readTags()).toEqual(["1.0.1"]);
    expect(github.readReleases().map((release) => release.tag_name)).toEqual(["1.0.1"]);
  });

  test("should print the version result as JSON", async ({ expect, workspace }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });

    expect((await workspace.runCLI(["version", "--json"])).stdout).toMatchSnapshot();
  });

  test("should print the publish result as JSON on every publish", async ({
    expect,
    workspace,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.runCLI(["version"]);

    expect((await workspace.runCLI(["publish", "--json"])).stdout).toMatchSnapshot();
    expect((await workspace.runCLI(["publish", "--json"])).stdout).toMatchSnapshot();
  });
});
