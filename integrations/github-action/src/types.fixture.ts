import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { ActionInputs } from "./types";

export const createActionInputs = defineObjectGenerator<ActionInputs>(() => ({
  command: "npx --no-install unirelman",
  workingDirectory: "/workspace",
  githubToken: "token",
  baseBranch: "main",
  branch: "unirelman/release",
  prTitle: "chore(release): bump versions",
}));
