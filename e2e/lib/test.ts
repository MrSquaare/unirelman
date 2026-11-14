import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { test as baseTest } from "vitest";

import type { WorkspaceSpec } from "./layout.ts";

import { WORKSPACES_DIR } from "./constants.ts";
import { GitHubAction } from "./github-action.ts";
import { GitHubServer } from "./github-server.ts";
import { renderWorkspaceFiles } from "./layout.ts";
import { NpmRegistry } from "./npm-registry.ts";
import { SINGLE_PACKAGE_SPEC } from "./presets.ts";
import { Workspace } from "./workspace.ts";

export const test = baseTest.extend<{
  workspaceSpec: WorkspaceSpec;
  temporaryDirectory: string;
  github: GitHubServer;
  npm: NpmRegistry;
  workspace: Workspace;
  githubAction: GitHubAction;
}>({
  workspaceSpec: SINGLE_PACKAGE_SPEC,
  temporaryDirectory: async ({ task }, use) => {
    await mkdir(WORKSPACES_DIR, { recursive: true });

    const directory = await mkdtemp(join(WORKSPACES_DIR, `${task.id}-`));

    await use(directory);
    await rm(directory, { recursive: true, force: true });
  },
  github: async ({ temporaryDirectory: _temporaryDirectory }, use) => {
    const github = await GitHubServer.start();

    await use(github);
    await github.stop();
  },
  npm: async ({ temporaryDirectory }, use) => {
    const npm = await NpmRegistry.start(join(temporaryDirectory, "npm"));

    await use(npm);
    await npm.stop();
  },
  workspace: async ({ workspaceSpec, temporaryDirectory, github, npm }, use) => {
    await use(
      await Workspace.create(renderWorkspaceFiles(workspaceSpec), temporaryDirectory, {
        ...github.environment,
        ...npm.environment,
      }),
    );
  },
  githubAction: async ({ workspace, temporaryDirectory }, use) => {
    await use(await GitHubAction.create(workspace, temporaryDirectory));
  },
});
