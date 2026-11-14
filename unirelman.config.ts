import { defineConfig } from "@unirelman/cli";
import { createChangelogPlugin } from "@unirelman/plugin-changelog";
import { createChangesetsPlugin } from "@unirelman/plugin-changesets";
import { createGitPlugin } from "@unirelman/plugin-git";
import { createGitHubPlugin } from "@unirelman/plugin-github";
import { createNpmPlugin } from "@unirelman/plugin-npm";
import { createSemverPlugin } from "@unirelman/plugin-semver";

export default defineConfig({
  scopes: {
    "@unirelman/cli": "packages/cli",
    "@unirelman/core": "packages/core",
    "@unirelman/helpers": "packages/helpers",
    "@unirelman/utils": "packages/utils",
    "@unirelman/plugin-calver": "plugins/calver",
    "@unirelman/plugin-changelog": "plugins/changelog",
    "@unirelman/plugin-changesets": "plugins/changesets",
    "@unirelman/plugin-git": "plugins/git",
    "@unirelman/plugin-github": "plugins/github",
    "@unirelman/plugin-npm": "plugins/npm",
    "@unirelman/plugin-replace": "plugins/replace",
    "@unirelman/plugin-semver": "plugins/semver",
  },
  plugins: [
    createChangesetsPlugin(),
    createChangelogPlugin({ mode: "scope" }),
    createNpmPlugin(),
    createGitPlugin(),
    createGitHubPlugin(),
    createSemverPlugin({ fixed: true, prereleaseChannels: ["alpha", "beta", "rc"] }),
  ],
});
