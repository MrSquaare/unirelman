import { describe } from "vitest";

import { createChangeset } from "../../lib/commands.ts";
import { CLI_PACKAGE, CORE_PACKAGE } from "../../lib/presets.ts";
import { test } from "../../lib/test.ts";

describe.concurrent("replace", () => {
  test.override({
    workspaceSpec: {
      packages: [CORE_PACKAGE, CLI_PACKAGE],
      files: {
        "README.md": "Install `@example/core@1.0.0` and `@example/cli@1.0.0`.\n",
        "NOTES.md": "Nothing to replace here.\n",
      },
      config: {
        scopes: { "@example/core": "packages/core", "@example/cli": "packages/cli" },
        plugins: [
          { name: "changesets" },
          { name: "changelog", options: '{ mode: "scope" }' },
          { name: "npm" },
          {
            name: "replace",
            options: `{ files: [
              { path: "README.md", scope: "@example/core", search: ({ currentVersion }) => new RegExp(RegExp.escape(\`@example/core@\${currentVersion}\`)), replace: ({ scopeName, nextVersion }) => \`\${scopeName}@\${nextVersion}\` },
              { path: "README.md", scope: "@example/cli", search: /@example\\/cli@\\d+\\.\\d+\\.\\d+/, replace: ({ scopeName, nextVersion }) => \`\${scopeName}@\${nextVersion}\` },
              { path: "NOTES.md", scope: "@example/core", search: /@example\\/core@\\d+\\.\\d+\\.\\d+/, replace: ({ scopeName, nextVersion }) => \`\${scopeName}@\${nextVersion}\`, allowNoMatch: true },
            ] }`,
          },
          { name: "git" },
          { name: "semver" },
        ],
      },
    },
  });

  test("should replace the references of every released scope", async ({ expect, workspace }) => {
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

    expect(await workspace.git.readFileAt("HEAD", "README.md")).toEqual(
      "Install `@example/core@1.1.0` and `@example/cli@1.0.1`.\n",
    );
    expect(await workspace.git.readFileAt("HEAD", "NOTES.md")).toEqual(
      "Nothing to replace here.\n",
    );
    expect(await workspace.git.readCommitFiles("HEAD")).toEqual([
      "README.md",
      "packages/cli/CHANGELOG.md",
      "packages/cli/package.json",
      "packages/core/CHANGELOG.md",
      "packages/core/package.json",
    ]);
  });

  test("should fail when a file without allowNoMatch has no match", async ({
    expect,
    workspace,
  }) => {
    await workspace.writeFile("README.md", "No reference.\n");
    await workspace.git.commit("docs: remove the version references");
    await createChangeset(workspace, {
      scopes: ["@example/cli"],
      level: "patch",
      message: "fix a bug",
    });

    const result = await workspace.runCLI(["version"], { exitCode: 1 });

    expect(result.stderr).toMatchSnapshot();
    expect(await workspace.git.readCommitMessages(workspace.initialCommit)).toEqual([
      "docs: remove the version references",
    ]);
  });
});
