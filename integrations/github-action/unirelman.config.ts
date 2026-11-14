import { defineConfig } from "@unirelman/cli";
import { createChangelogPlugin } from "@unirelman/plugin-changelog";
import { createChangesetsPlugin } from "@unirelman/plugin-changesets";
import { createGitPlugin, type GitTagFormat } from "@unirelman/plugin-git";
import { createGitHubPlugin } from "@unirelman/plugin-github";
import { createNpmPlugin } from "@unirelman/plugin-npm";
import { createReplacePlugin, type ReplaceFile } from "@unirelman/plugin-replace";
import { createSemverPlugin } from "@unirelman/plugin-semver";

const ACTION_SCOPE_NAME = "@unirelman/github-action";
const ACTION_REFERENCE = /github-action@v\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?/;
const ACTION_REFERENCE_FILES = [
  "README.md",
  "../../docs/src/content/docs/guides/publish-to-npm.mdx",
  "../../docs/src/content/docs/reference/integrations/github-action.md",
  "../../docs/src/content/docs/tutorials/github-action.mdx",
];

const tagFormat: GitTagFormat = ({ version }) => `v${version}`;
const actionReferenceFiles = ACTION_REFERENCE_FILES.map((path): ReplaceFile => ({
  path,
  scope: ACTION_SCOPE_NAME,
  search: ACTION_REFERENCE,
  replace: ({ nextVersion }) => `github-action@v${nextVersion}`,
}));

export default defineConfig({
  scopes: {
    [ACTION_SCOPE_NAME]: "./",
  },
  plugins: [
    createChangesetsPlugin(),
    createChangelogPlugin({ mode: "scope" }),
    createNpmPlugin({ publish: false }),
    createReplacePlugin({ files: actionReferenceFiles }),
    createGitPlugin({ tagFormat }),
    createGitHubPlugin({ tagFormat }),
    createSemverPlugin({ prereleaseChannels: ["alpha", "beta", "rc"] }),
  ],
});
