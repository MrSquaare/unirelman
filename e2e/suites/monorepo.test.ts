import { describe } from "vitest";

import type { PluginEntry } from "../lib/config.ts";

import { createChangeset } from "../lib/commands.ts";
import {
  CLI_PACKAGE,
  CORE_PACKAGE,
  MONOREPO_SCOPES,
  SEMVER_PRERELEASE_OPTIONS,
  UI_PACKAGE,
} from "../lib/presets.ts";
import { readChangelog, readPackageVersion } from "../lib/readers.ts";
import { test } from "../lib/test.ts";

const CALVER_UI_PACKAGE = { ...UI_PACKAGE, version: "2026.01.01.0", private: true };

const SCOPE_RELEASE_PLUGINS: readonly PluginEntry[] = [
  { name: "changesets" },
  { name: "changelog", options: '{ mode: "scope" }' },
  { name: "npm" },
  { name: "git" },
];

describe.concurrent("monorepo", () => {
  describe("independent scopes", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, CALVER_UI_PACKAGE],
        config: {
          scopes: MONOREPO_SCOPES,
          plugins: [
            { name: "changesets" },
            { name: "changelog" },
            { name: "npm" },
            { name: "git" },
            { name: "github" },
            { name: "semver", options: SEMVER_PRERELEASE_OPTIONS, scopes: ["@example/core"] },
            { name: "calver", options: SEMVER_PRERELEASE_OPTIONS, scopes: ["@example/ui"] },
          ],
        },
      },
    });

    test("should release one scope with its own versioning scheme", async ({
      expect,
      workspace,
      github,
      npm,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "patch",
        message: "fix core",
      });
      await workspace.release();

      expect({
        history: await workspace.git.readHistory(workspace.initialCommit),
        releases: github.readReleases(),
        packages: npm.readPackages(),
      }).toMatchSnapshot();
    });

    test("should release a change shared by several scopes, each with its scheme", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core", "@example/ui"],
        level: "minor",
        message: "add a shared feature",
      });
      await workspace.release({ now: "2026-07-24T12:00:00Z" });

      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.1.0");
      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("2026.07.24.0");
      expect(await workspace.git.readTags()).toEqual([
        "@example/core@1.1.0",
        "@example/ui@2026.07.24.0",
      ]);
      expect(await workspace.git.readCommitMessages(workspace.initialCommit)).toEqual([
        "chore(release): bump versions",
      ]);
    });

    test("should fail when a changeset names an unknown scope", async ({ expect, workspace }) => {
      const result = await createChangeset(
        workspace,
        { scopes: ["@example/missing"], level: "patch", message: "fix a bug" },
        { exitCode: 1 },
      );

      expect(result.stderr).toMatchSnapshot();
      expect(await workspace.git.readStatus()).toEqual("");
    });
  });

  describe("root scope", () => {
    test.override({
      workspaceSpec: {
        packages: [{ path: ".", name: "example", version: "1.0.0" }, CORE_PACKAGE],
        config: {
          scopes: { root: "./", "@example/core": "packages/core" },
          plugins: [...SCOPE_RELEASE_PLUGINS, { name: "semver" }],
        },
      },
    });

    test("should release the root scope next to a package scope", async ({
      expect,
      workspace,
      npm,
    }) => {
      await createChangeset(workspace, {
        scopes: ["root", "@example/core"],
        level: "patch",
        message: "fix root and core",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.0.1");
      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.0.1");
      expect(await workspace.git.readTags()).toEqual(["1.0.1", "@example/core@1.0.1"]);
      expect(await readChangelog(workspace.git, ".")).toEqual(
        "# root Changelog\n\n## 1.0.1\n\n### Patch changes\n\n- fix root and core\n",
      );
      expect(npm.readPackages()).toEqual({
        "@example/core": { distTags: { latest: "1.0.1" }, versions: ["1.0.1"] },
        example: { distTags: { latest: "1.0.1" }, versions: ["1.0.1"] },
      });
    });

    test("should release each scope at its own highest pending level", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, {
        scopes: ["root", "@example/core"],
        level: "patch",
        message: "fix a bug",
      });
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("1.0.1");
      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.1.0");
    });
  });

  describe("fixed scopes", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, UI_PACKAGE],
        config: {
          scopes: MONOREPO_SCOPES,
          plugins: [...SCOPE_RELEASE_PLUGINS, { name: "semver", options: "{ fixed: true }" }],
        },
      },
    });

    test("should release every fixed scope at the same version", async ({ expect, workspace }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.1.0");
      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.1.0");
      expect(await readChangelog(workspace.git, "packages/ui")).toEqual(
        "# @example/ui Changelog\n\n## 1.1.0\n\n### Changes\n\n- No user-facing changes.\n",
      );
    });

    test("should fail when fixed scopes have different current versions", async ({
      expect,
      workspace,
    }) => {
      await workspace.writeFile(
        "packages/ui/package.json",
        `${JSON.stringify({ name: "@example/ui", version: "1.1.0", type: "module" }, null, 2)}\n`,
      );
      await workspace.git.commit("chore: diverge ui version");
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "patch",
        message: "fix a bug",
      });

      const result = await workspace.runCLI(["version"], { exitCode: 1 });

      expect(result.stderr).toMatchSnapshot();
    });
  });

  describe("groups", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, UI_PACKAGE, CLI_PACKAGE],
        config: {
          scopes: { ...MONOREPO_SCOPES, "@example/cli": "packages/cli" },
          plugins: [
            ...SCOPE_RELEASE_PLUGINS,
            { name: "semver", options: '{ fixed: { product: ["@example/core", "@example/ui"] } }' },
          ],
        },
      },
    });

    test("should release a group together and an independent scope on its own", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await createChangeset(workspace, {
        scopes: ["@example/cli"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, "packages/core")).toEqual("1.1.0");
      expect(await readPackageVersion(workspace.git, "packages/ui")).toEqual("1.1.0");
      expect(await readPackageVersion(workspace.git, "packages/cli")).toEqual("1.0.1");
    });
  });
});
