import { describe } from "vitest";

import { createChangeset, runPrerelease } from "../lib/commands.ts";
import { CLI_PACKAGE, CORE_PACKAGE, MONOREPO_SCOPES, UI_PACKAGE } from "../lib/presets.ts";
import { readChangelog, readPackageVersion } from "../lib/readers.ts";
import { test } from "../lib/test.ts";

describe.concurrent("prerelease", () => {
  describe("single package", () => {
    test("should release a prerelease on the selected channel", async ({
      expect,
      workspace,
      github,
      npm,
    }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.1.0-alpha.0");
      expect(await workspace.git.readTags()).toEqual(["1.1.0-alpha.0"]);
      expect(npm.readPackages()).toEqual({
        example: { distTags: { alpha: "1.1.0-alpha.0" }, versions: ["1.1.0-alpha.0"] },
      });
      expect(
        github
          .readReleases()
          .map(({ tag_name, prerelease, make_latest }) => ({ tag_name, prerelease, make_latest })),
      ).toEqual([{ tag_name: "1.1.0-alpha.0", prerelease: true, make_latest: "false" }]);
    });

    test("should iterate a prerelease on the same channel", async ({ expect, workspace }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.1.0-alpha.1");
      expect(await workspace.git.readTags()).toEqual(["1.1.0-alpha.0", "1.1.0-alpha.1"]);
    });

    test("should restart a prerelease on an upper channel", async ({ expect, workspace }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "beta"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.1.0-beta.0");
      expect(await workspace.git.readTags()).toEqual(["1.1.0-alpha.0", "1.1.0-beta.0"]);
    });

    test("should release the prerelease base as stable when exiting without changes", async ({
      expect,
      workspace,
      npm,
    }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();
      await runPrerelease(workspace, "semver", ["--scope", "example", "--exit"]);
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.1.0");
      expect(await readChangelog(workspace.git, ".")).toEqual(
        "# Changelog\n\n## example - 1.1.0\n\n### Changes\n\n- No user-facing changes.\n\n## example - 1.1.0-alpha.0\n\n### Minor changes\n\n- add a feature\n",
      );
      expect(npm.readPackages()).toEqual({
        example: {
          distTags: { alpha: "1.1.0-alpha.0", latest: "1.1.0" },
          versions: ["1.1.0-alpha.0", "1.1.0"],
        },
      });
    });

    test("should bump the stable version when exiting a prerelease with a bigger change", async ({
      expect,
      workspace,
    }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();
      await runPrerelease(workspace, "semver", ["--scope", "example", "--exit"]);
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "major",
        message: "drop a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2.0.0");
      expect(await workspace.git.readTags()).toEqual(["1.1.0-alpha.0", "2.0.0"]);
    });

    test("should print the prerelease transitions as JSON", async ({ expect, workspace }) => {
      const entered = await runPrerelease(workspace, "semver", [
        "--json",
        "--scope",
        "example",
        "--channel",
        "beta",
      ]);
      const exited = await runPrerelease(workspace, "semver", [
        "--json",
        "--scope",
        "example",
        "--exit",
      ]);

      expect({ entered: entered.stdout, exited: exited.stdout }).toMatchSnapshot();
    });

    test("should fail when selecting an unknown prerelease channel", async ({
      expect,
      workspace,
    }) => {
      const result = await runPrerelease(
        workspace,
        "semver",
        ["--scope", "example", "--channel", "zeta"],
        { exitCode: 1 },
      );

      expect(result.stderr).toMatchSnapshot();
      expect(await workspace.git.readStatus()).toEqual("");
    });

    test("should fail when downgrading a prerelease channel", async ({ expect, workspace }) => {
      await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "beta"]);

      const result = await runPrerelease(
        workspace,
        "semver",
        ["--scope", "example", "--channel", "alpha"],
        { exitCode: 1 },
      );

      expect(result.stderr).toMatchSnapshot();
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
            {
              name: "semver",
              options: `{ fixed: true, prereleaseChannels: ["alpha", "beta", "rc"] }`,
            },
          ],
        },
      },
    });

    test("should enter and exit a prerelease for every fixed scope", async ({
      expect,
      workspace,
      npm,
    }) => {
      await runPrerelease(workspace, "semver", ["--channel", "beta"]);
      await createChangeset(workspace, {
        scopes: ["@example/ui"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();
      await runPrerelease(workspace, "semver", ["--exit"]);
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.0.1");
      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.0.1");
      expect(await workspace.git.readTags()).toEqual([
        "@example/core@1.0.1",
        "@example/core@1.0.1-beta.0",
        "@example/ui@1.0.1",
        "@example/ui@1.0.1-beta.0",
      ]);
      expect(npm.readPackages()).toEqual({
        "@example/core": {
          distTags: { beta: "1.0.1-beta.0", latest: "1.0.1" },
          versions: ["1.0.1-beta.0", "1.0.1"],
        },
        "@example/ui": {
          distTags: { beta: "1.0.1-beta.0", latest: "1.0.1" },
          versions: ["1.0.1-beta.0", "1.0.1"],
        },
      });
    });
  });

  describe("named group", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, UI_PACKAGE, CLI_PACKAGE],
        config: {
          scopes: { ...MONOREPO_SCOPES, "@example/cli": "packages/cli" },
          plugins: [
            { name: "changesets" },
            { name: "changelog", options: '{ mode: "scope" }' },
            { name: "npm" },
            { name: "git" },
            {
              name: "semver",
              options: `{ fixed: { product: ["@example/core", "@example/ui"] }, prereleaseChannels: ["alpha", "beta", "rc"] }`,
            },
          ],
        },
      },
    });

    test("should enter a prerelease for a group by name, leaving other scopes stable", async ({
      expect,
      workspace,
    }) => {
      await runPrerelease(workspace, "semver", ["--group", "product", "--channel", "alpha"]);
      await createChangeset(workspace, {
        scopes: ["@example/ui", "@example/cli"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.0.1-alpha.0");
      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.0.1-alpha.0");
      expect(await readPackageVersion(workspace.git, "packages/cli")).toEqual("1.0.1");
    });

    test("should fail when targeting a grouped scope as an independent scope", async ({
      expect,
      workspace,
    }) => {
      const result = await runPrerelease(
        workspace,
        "semver",
        ["--scope", "@example/core", "--channel", "alpha"],
        { exitCode: 1 },
      );

      expect(result.stderr).toMatchSnapshot();
    });
  });
});
