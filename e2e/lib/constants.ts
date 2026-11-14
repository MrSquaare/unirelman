import { join, resolve } from "node:path";

const E2E_DIR = resolve(import.meta.dirname, "..");
const MOCK_DATE_SCRIPT_PATH = join(E2E_DIR, "lib/mocks/date.cjs");
const MOCK_RANDOM_SCRIPT_PATH = join(E2E_DIR, "lib/mocks/random.cjs");
const CLI_BIN_PATH = resolve(E2E_DIR, "../packages/cli/dist/bin.mjs");

export const WORKSPACES_DIR = join(E2E_DIR, ".workspaces");
export const GITHUB_ACTION_PATH = resolve(E2E_DIR, "../integrations/github-action/dist/index.mjs");

export const CLI_ARGS = ["-r", MOCK_DATE_SCRIPT_PATH, "-r", MOCK_RANDOM_SCRIPT_PATH, CLI_BIN_PATH];
export const CLI_COMMAND = ["node", ...CLI_ARGS].map((arg) => `"${arg}"`).join(" ");

export const DEFAULT_NOW = "2026-01-01T12:00:00Z";
export const DEFAULT_BRANCH = "main";
export const RELEASE_BRANCH = "unirelman/release";
export const RELEASE_PULL_REQUEST_TITLE = "chore(release): bump versions";
export const WORKING_DIRECTORY = ".";

export const GIT_ENVIRONMENT = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_DATE: DEFAULT_NOW,
  GIT_COMMITTER_DATE: DEFAULT_NOW,
};

export const GITHUB_OWNER = "unirelman";
export const GITHUB_REPO = "example";
export const GITHUB_TOKEN = "e2e-token";
