import { describe } from "vitest";

import type { PluginEntry } from "../../lib/config.ts";

import { createChangeset, runPrerelease } from "../../lib/commands.ts";
import { SEMVER_PRERELEASE_OPTIONS } from "../../lib/presets.ts";
import { readPackageVersion } from "../../lib/readers.ts";
import { test } from "../../lib/test.ts";

const RELEASE_PLUGINS: readonly PluginEntry[] = [
  { name: "changesets" },
  { name: "changelog" },
  { name: "npm" },
  { name: "git" },
];
const JULY_24 = "2026-07-24T12:00:00Z";
const JULY_25 = "2026-07-25T12:00:00Z";

describe.concurrent("calver", () => {
  describe("day granularity", () => {
    test.override({
      workspaceSpec: {
        packages: [{ path: ".", name: "example", version: "2026.01.01.0", private: true }],
        config: {
          scopes: { example: "./" },
          plugins: [...RELEASE_PLUGINS, { name: "calver", options: SEMVER_PRERELEASE_OPTIONS }],
        },
      },
    });

    test("should release on a new date with a zero micro version", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: JULY_24 });

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.07.24.0");
      expect(await workspace.git.readTags()).toEqual(["2026.07.24.0"]);
    });

    test("should increment the micro version on the same date", async ({ expect, workspace }) => {
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release();
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "again" });
      await workspace.release();

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.01.01.2");
      expect(await workspace.git.readTags()).toEqual(["2026.01.01.1", "2026.01.01.2"]);
    });

    test("should release the prerelease base as stable when exiting without changes", async ({
      expect,
      workspace,
    }) => {
      await runPrerelease(workspace, "calver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: JULY_24 });
      await runPrerelease(workspace, "calver", ["--scope", "example", "--exit"]);
      await workspace.release({ now: JULY_25 });

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.07.24.0");
      expect(await workspace.git.readTags()).toEqual(["2026.07.24.0", "2026.07.24.0-alpha.0"]);
    });

    test("should release on the new date when exiting a prerelease with changes", async ({
      expect,
      workspace,
    }) => {
      await runPrerelease(workspace, "calver", ["--scope", "example", "--channel", "alpha"]);
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: JULY_24 });
      await runPrerelease(workspace, "calver", ["--scope", "example", "--exit"]);
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "again" });
      await workspace.release({ now: JULY_25 });

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.07.25.0");
      expect(await workspace.git.readTags()).toEqual(["2026.07.24.0-alpha.0", "2026.07.25.0"]);
    });

    test("should fail when the current version is dated after today", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: JULY_24 });
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "again" });

      const result = await workspace.runCLI(["version"], { exitCode: 1 });

      expect(result.stderr).toMatchSnapshot();
      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.07.24.0");
    });
  });

  describe("month granularity", () => {
    test.override({
      workspaceSpec: {
        packages: [{ path: ".", name: "example", version: "2026.06.0", private: true }],
        config: {
          scopes: { example: "./" },
          plugins: [...RELEASE_PLUGINS, { name: "calver", options: '{ granularity: "month" }' }],
        },
      },
    });

    test("should release on a new month with a zero micro version", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: JULY_24 });

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.07.0");
    });

    test("should increment the micro version in the same month", async ({ expect, workspace }) => {
      await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix" });
      await workspace.release({ now: "2026-06-15T12:00:00Z" });

      expect(await readPackageVersion(workspace.git, ".")).toEqual("2026.06.1");
    });
  });
});
