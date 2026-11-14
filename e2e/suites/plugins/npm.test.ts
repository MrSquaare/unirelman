import { describe } from "vitest";

import type { WorkspaceSpec } from "../../lib/layout.ts";

import { createChangeset, runPrerelease } from "../../lib/commands.ts";
import { CORE_PACKAGE, MONOREPO_SCOPES, UI_PACKAGE } from "../../lib/presets.ts";
import { readChangelog, readPackageJson, readPackageVersion } from "../../lib/readers.ts";
import { test } from "../../lib/test.ts";

const pnpmWorkspaceSpec = (uiDependencies: {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}): WorkspaceSpec => ({
  packages: [CORE_PACKAGE, { ...UI_PACKAGE, ...uiDependencies }],
  config: {
    scopes: MONOREPO_SCOPES,
    plugins: [
      { name: "changesets" },
      { name: "changelog", options: '{ mode: "scope" }' },
      { name: "npm", options: '{ packageManager: "pnpm" }' },
      { name: "git" },
      { name: "semver" },
    ],
  },
});

describe.concurrent("npm", () => {
  test("should publish a prerelease under its channel while latest stays on the stable version", async ({
    expect,
    workspace,
    npm,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.release();
    await runPrerelease(workspace, "semver", ["--scope", "example", "--channel", "alpha"]);
    await createChangeset(workspace, {
      scopes: ["example"],
      level: "minor",
      message: "add a feature",
    });
    await workspace.release();

    expect(npm.readPackages()).toEqual({
      example: {
        distTags: { latest: "1.0.1", alpha: "1.1.0-alpha.0" },
        versions: ["1.0.1", "1.1.0-alpha.0"],
      },
    });
  });

  test("should fail when the registry rejects the credentials", async ({
    expect,
    workspace,
    npm,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.runCLI(["version"]);

    npm.revokeToken();

    const result = await workspace.runCLI(["publish"], { exitCode: 1 });

    expect(result.stderr).toMatchSnapshot();
    expect(npm.readPackages()).toEqual({});
  });

  describe("pnpm workspace dependencies", () => {
    test.override({
      workspaceSpec: pnpmWorkspaceSpec({ dependencies: { "@example/core": "workspace:^" } }),
    });

    test("should publish workspace dependencies with their resolved versions", async ({
      expect,
      workspace,
      npm,
    }) => {
      await workspace.runProcess("pnpm", ["install", "--offline", "--no-lockfile"]);
      await createChangeset(workspace, {
        scopes: ["@example/core", "@example/ui"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(npm.readDependencies("@example/ui", "1.1.0")).toEqual({ "@example/core": "^1.1.0" });
      expect(await readChangelog(workspace.git, "packages/ui")).toEqual(
        "# @example/ui Changelog\n\n## 1.1.0\n\n### Minor changes\n\n- add a feature\n\n### Patch changes\n\n- Updated dependencies: @example/core@1.1.0\n",
      );
    });

    test("should release dependents of a scope released out of their range", async ({
      expect,
      workspace,
      npm,
    }) => {
      await workspace.runProcess("pnpm", ["install", "--offline", "--no-lockfile"]);
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "major",
        message: "drop a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.0.1");
      expect(npm.readDependencies("@example/ui", "1.0.1")).toEqual({ "@example/core": "^2.0.0" });
      expect(await readChangelog(workspace.git, "packages/ui")).toEqual(
        "# @example/ui Changelog\n\n## 1.0.1\n\n### Patch changes\n\n- Updated dependencies: @example/core@2.0.0\n",
      );
    });

    test("should keep dependents of a scope released in their range", async ({
      expect,
      workspace,
      npm,
    }) => {
      await workspace.runProcess("pnpm", ["install", "--offline", "--no-lockfile"]);
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.0.0");
      expect(await workspace.git.hasFileAt("HEAD", "packages/ui/CHANGELOG.md")).toEqual(false);
      expect(npm.readPackages()).toEqual({
        "@example/core": { distTags: { latest: "1.1.0" }, versions: ["1.1.0"] },
        "@example/ui": { distTags: { latest: "1.0.0" }, versions: ["1.0.0"] },
      });
    });

    test("should list the updated dependencies of a scope released with its own changes", async ({
      expect,
      workspace,
    }) => {
      await workspace.runProcess("pnpm", ["install", "--offline", "--no-lockfile"]);
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "major",
        message: "drop a feature",
      });
      await createChangeset(workspace, {
        scopes: ["@example/ui"],
        level: "minor",
        message: "add a component",
      });
      await workspace.release();

      expect(await readChangelog(workspace.git, "packages/ui")).toEqual(
        "# @example/ui Changelog\n\n## 1.1.0\n\n### Minor changes\n\n- add a component\n\n### Patch changes\n\n- Updated dependencies: @example/core@2.0.0\n",
      );
    });
  });

  describe("pnpm workspace dev dependencies", () => {
    test.override({
      workspaceSpec: pnpmWorkspaceSpec({
        devDependencies: { "@example/core": "workspace:^1.0.0" },
      }),
    });

    test("should update the dev ranges of a dependent without releasing it", async ({
      expect,
      workspace,
    }) => {
      await workspace.runProcess("pnpm", ["install", "--offline", "--no-lockfile"]);
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "major",
        message: "drop a feature",
      });
      await workspace.release();

      expect(await readPackageJson(workspace.git, "packages/ui")).toEqual({
        name: "@example/ui",
        version: "1.0.0",
        type: "module",
        devDependencies: { "@example/core": "workspace:^2.0.0" },
      });
    });
  });
});
