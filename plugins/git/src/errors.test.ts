import { afterEach, describe, expect, it, vi } from "vitest";

import { GitError } from "./errors";

describe("GitError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new GitError("git failure");

      expect(error.message).toEqual("git failure");
      expect(error.name).toEqual("GitError");
    });
  });
});
