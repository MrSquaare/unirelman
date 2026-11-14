import { describe } from "vitest";

import { createChangeset } from "../../lib/commands.ts";
import { CORE_PACKAGE } from "../../lib/presets.ts";
import { readChangelog } from "../../lib/readers.ts";
import { test } from "../../lib/test.ts";

describe.concurrent("changelog", () => {
  describe("custom headers", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE],
        config: {
          scopes: { "@example/core": "packages/core" },
          plugins: [
            { name: "changesets" },
            {
              name: "changelog",
              options:
                '{ mode: "scope", header: ({ scopeName }) => `# ${scopeName} release notes`, levelHeaders: { minor: "Features", patch: "Fixes" }}',
            },
            { name: "npm" },
            { name: "git" },
            { name: "semver" },
          ],
        },
      },
    });

    test("should write the header and the level headers of the options", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await readChangelog(workspace.git, "packages/core")).toEqual(
        "# @example/core release notes\n\n## 1.1.0\n\n### Features\n\n- add a feature\n\n### Fixes\n\n- fix a bug\n",
      );
    });
  });

  describe("change messages", () => {
    test("should keep every line of a multiline message inside its entry", async ({
      expect,
      workspace,
      github,
    }) => {
      await createChangeset(workspace, {
        scopes: ["example"],
        level: "minor",
        message: "add a feature\n\nIt has a second paragraph.\n\n## Usage\n\nRun it.",
      });
      await workspace.release();

      expect(await readChangelog(workspace.git, ".")).toEqual(
        "# Changelog\n\n## example - 1.1.0\n\n### Minor changes\n\n- add a feature\n\n  It has a second paragraph.\n\n  ## Usage\n\n  Run it.\n",
      );
      expect(github.readReleases().map((release) => release.body)).toEqual([
        "### Minor changes\n\n- add a feature\n\n  It has a second paragraph.\n\n  ## Usage\n\n  Run it.",
      ]);
    });
  });
});
