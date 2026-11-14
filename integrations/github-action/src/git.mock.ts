import { vi } from "vitest";

import {
  checkoutBranch,
  commitFiles,
  configureGitIdentity,
  pushBranch,
  pushGitTags,
  readHeadCommit,
  resolvePublishedGitTags,
} from "./git";

vi.mock("./git", async (importActual) => {
  const actual = await importActual<typeof import("./git")>();

  return {
    ...actual,
    checkoutBranch: vi.fn(),
    commitFiles: vi.fn(),
    configureGitIdentity: vi.fn(),
    pushBranch: vi.fn(),
    pushGitTags: vi.fn(),
    readHeadCommit: vi.fn(),
    resolvePublishedGitTags: vi.fn(actual.resolvePublishedGitTags),
  };
});

export const mockedCheckoutBranch = vi.mocked(checkoutBranch);
export const mockedCommitFiles = vi.mocked(commitFiles);
export const mockedConfigureGitIdentity = vi.mocked(configureGitIdentity);
export const mockedPushBranch = vi.mocked(pushBranch);
export const mockedPushGitTags = vi.mocked(pushGitTags);
export const mockedReadHeadCommit = vi.mocked(readHeadCommit);
export const mockedResolvePublishedGitTags = vi.mocked(resolvePublishedGitTags);
