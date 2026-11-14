import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GitHubError,
  GitHubInvalidRepositoryError,
  GitHubMissingOptionError,
  GitHubUnknownLatestScopeError,
} from "./errors";

describe("GitHubError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new GitHubError("github failure");

      expect(error.message).toEqual("github failure");
      expect(error.name).toEqual("GitHubError");
    });
  });
});

describe("GitHubMissingOptionError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new GitHubMissingOptionError("token", ["GITHUB_TOKEN", "GH_TOKEN"]);

      expect(error.message).toEqual(
        'Missing GitHub plugin option "token": none of GITHUB_TOKEN, GH_TOKEN is set',
      );
      expect(error.name).toEqual("GitHubMissingOptionError");
      expect(error.optionName).toEqual("token");
      expect(error.environmentVariables).toEqual(["GITHUB_TOKEN", "GH_TOKEN"]);
    });
  });
});

describe("GitHubInvalidRepositoryError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new GitHubInvalidRepositoryError("owner");

      expect(error.message).toEqual(
        'Invalid GitHub repository "owner": expected the "owner/name" format',
      );
      expect(error.name).toEqual("GitHubInvalidRepositoryError");
      expect(error.repository).toEqual("owner");
    });
  });
});

describe("GitHubUnknownLatestScopeError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new GitHubUnknownLatestScopeError("@scope/missing");

      expect(error.message).toEqual(
        'Scope "@scope/missing" of the GitHub plugin option "makeLatest" is not a scope of the plugin',
      );
      expect(error.name).toEqual("GitHubUnknownLatestScopeError");
      expect(error.scopeName).toEqual("@scope/missing");
    });
  });
});
