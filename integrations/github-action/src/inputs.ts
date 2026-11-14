import { getInput } from "@actions/core";
import { resolve } from "node:path";

import type { ActionInputs } from "./types";

export const readActionInputs = (): ActionInputs => {
  return {
    command: getInput("command", { required: true }),
    workingDirectory: resolve(getInput("working-directory", { required: true })),
    githubToken: getInput("github-token", { required: true }),
    baseBranch: getInput("base-branch", { required: true }),
    branch: getInput("branch", { required: true }),
    prTitle: getInput("pr-title", { required: true }),
  };
};
