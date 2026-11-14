import { describe, expect, it } from "vitest";

import { ActionError, ActionMissingReleaseCommitError } from "./errors";

describe("ActionError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ActionError("action failure");

      expect(error.message).toEqual("action failure");
      expect(error.name).toEqual("ActionError");
    });
  });
});

describe("ActionMissingReleaseCommitError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ActionMissingReleaseCommitError();

      expect(error.message).toEqual("unirelman version changed files but created no commit");
      expect(error.name).toEqual("ActionMissingReleaseCommitError");
    });
  });
});
