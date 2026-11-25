import { describe } from "vitest";

import { createChangeset } from "../../lib/commands.ts";
import { CLI_PACKAGE, CORE_PACKAGE } from "../../lib/presets.ts";
import { test } from "../../lib/test.ts";

describe.concurrent("git", () => {
  test("should leave unrelated staged changes out of the release commit", async ({
    expect,
    workspace,
  }) => {
    await workspace.writeFile("notes.txt", "unrelated\n");
    await workspace.git.stage(["notes.txt"]);
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.runCLI(["version"]);

    expect(await workspace.git.readCommitFiles("HEAD")).toEqual(["CHANGELOG.md", "package.json"]);
    expect(await workspace.git.readStatus()).toEqual("A  notes.txt\n");
  });

  describe("commit message and annotated tags", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, CLI_PACKAGE],
        config: {
          scopes: { "@example/core": "packages/core", "@example/cli": "packages/cli" },
          plugins: [
            { name: "changesets" },
            { name: "changelog", options: '{ mode: "scope" }' },
            { name: "npm" },
            {
              name: "git",
              options:
                '{ annotatedTags: true, commitMessage: ({ nextVersions }) => `chore(release): ${[...nextVersions].map(([scopeName, version]) => `${scopeName}@${version}`).join(", ")}` }',
            },
            { name: "semver" },
          ],
        },
      },
    });

    test("should commit with the message of the options and create annotated tags", async ({
      expect,
      workspace,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core", "@example/cli"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(await workspace.git.readCommitMessages(workspace.initialCommit)).toEqual([
        "chore(release): @example/core@1.0.1, @example/cli@1.0.1",
      ]);
      expect(await workspace.git.readTagObjectTypes()).toEqual([
        "@example/cli@1.0.1 tag",
        "@example/core@1.0.1 tag",
      ]);
    });
  });
});
