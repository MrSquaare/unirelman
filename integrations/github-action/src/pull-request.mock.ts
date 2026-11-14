import { vi, type MockedFunction } from "vitest";

import {
  closeReleasePullRequest,
  findReleasePullRequest,
  formatReleasePullRequestBody,
  upsertReleasePullRequest,
} from "./pull-request";

vi.mock("./pull-request", async (importActual) => {
  const actual = await importActual<typeof import("./pull-request")>();

  return {
    ...actual,
    closeReleasePullRequest: vi.fn(),
    findReleasePullRequest: vi.fn(),
    formatReleasePullRequestBody: vi.fn(actual.formatReleasePullRequestBody),
    upsertReleasePullRequest: vi.fn(),
  };
});

export const mockedCloseReleasePullRequest: MockedFunction<typeof closeReleasePullRequest> =
  vi.mocked(closeReleasePullRequest);
export const mockedFindReleasePullRequest: MockedFunction<typeof findReleasePullRequest> =
  vi.mocked(findReleasePullRequest);
export const mockedFormatReleasePullRequestBody: MockedFunction<
  typeof formatReleasePullRequestBody
> = vi.mocked(formatReleasePullRequestBody);
export const mockedUpsertReleasePullRequest: MockedFunction<typeof upsertReleasePullRequest> =
  vi.mocked(upsertReleasePullRequest);
