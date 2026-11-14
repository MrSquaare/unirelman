import { describe } from "vitest";

import type { PluginEntry } from "../../lib/config.ts";

import { createChangeset } from "../../lib/commands.ts";
import { CLI_PACKAGE, CORE_PACKAGE } from "../../lib/presets.ts";
import { test } from "../../lib/test.ts";

const SCOPES = { "@example/core": "packages/core", "@example/cli": "packages/cli" };
const RELEASE_PLUGINS: readonly PluginEntry[] = [
  { name: "changesets" },
  { name: "changelog", options: '{ mode: "scope" }' },
  { name: "npm" },
];

describe.concurrent("github", () => {
  test("should create a release named after the tag with the changelog section", async ({
    expect,
    workspace,
    github,
  }) => {
    await createChangeset(workspace, { scopes: ["example"], level: "patch", message: "fix a bug" });
    await workspace.release();

    const commit = (await workspace.git.readHead()).trim();

    expect(
      github
        .readReleases()
        .map(({ tag_name, name, body, target_commitish, draft, prerelease, make_latest }) => ({
          tag_name,
          name,
          body,
          target_commitish,
          draft,
          prerelease,
          make_latest,
        })),
    ).toEqual([
      {
        tag_name: "1.0.1",
        name: "1.0.1",
        body: "### Patch changes\n\n- fix a bug",
        target_commitish: commit,
        draft: false,
        prerelease: false,
        make_latest: "true",
      },
    ]);
  });

  describe("drafts and latest release", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, CLI_PACKAGE],
        config: {
          scopes: SCOPES,
          plugins: [
            ...RELEASE_PLUGINS,
            { name: "git" },
            {
              name: "github",
              options:
                '{ draft: ({ scopeName }) => scopeName === "@example/cli", makeLatest: "@example/core" }',
            },
            { name: "semver" },
          ],
        },
      },
    });

    test("should create drafts and mark the latest release per scope", async ({
      expect,
      workspace,
      github,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core", "@example/cli"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();

      expect(
        github
          .readReleases()
          .map(({ tag_name, draft, make_latest }) => ({ tag_name, draft, make_latest })),
      ).toEqual([
        { tag_name: "@example/core@1.0.1", draft: false, make_latest: "true" },
        { tag_name: "@example/cli@1.0.1", draft: true, make_latest: "false" },
      ]);
    });

    test("should keep a single draft release when publishing again", async ({
      expect,
      workspace,
      github,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/cli"],
        level: "patch",
        message: "fix a bug",
      });
      await workspace.release();
      await workspace.runCLI(["publish"]);

      expect(github.readReleases().map(({ tag_name, draft }) => ({ tag_name, draft }))).toEqual([
        { tag_name: "@example/core@1.0.0", draft: false },
        { tag_name: "@example/cli@1.0.1", draft: true },
      ]);
    });
  });

  describe("tag format", () => {
    test.override({
      workspaceSpec: {
        packages: [CORE_PACKAGE, CLI_PACKAGE],
        config: {
          scopes: SCOPES,
          preamble: "const tagFormat = ({ scopeName, version }) => `${scopeName}/v${version}`;",
          plugins: [
            ...RELEASE_PLUGINS,
            { name: "git", options: "{ tagFormat }" },
            { name: "github", options: "{ tagFormat }" },
            { name: "semver" },
          ],
        },
      },
    });

    test("should name releases after the tags of the shared tag format", async ({
      expect,
      workspace,
      github,
    }) => {
      await createChangeset(workspace, {
        scopes: ["@example/core"],
        level: "minor",
        message: "add a feature",
      });
      await workspace.release();

      expect(await workspace.git.readTags()).toEqual([
        "@example/cli/v1.0.0",
        "@example/core/v1.1.0",
      ]);
      expect(github.readReleases().map((release) => release.tag_name)).toEqual([
        "@example/core/v1.1.0",
        "@example/cli/v1.0.0",
      ]);
    });
  });
});
