import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { describe, expect, it } from "vitest";

import {
  ChangesetsError,
  ChangesetsInvalidFileError,
  ChangesetsInvalidLevelError,
  ChangesetsInvalidScopesError,
  ChangesetsMissingFieldError,
  ChangesetsMissingFrontmatterError,
} from "./errors";

describe("ChangesetsError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ChangesetsError("changesets failure");

      expect(error.message).toEqual("changesets failure");
      expect(error.name).toEqual("ChangesetsError");
    });

    it("should construct with a cause", () => {
      const cause = new Error("root cause");
      const error = new ChangesetsError("changesets failure", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("ChangesetsInvalidScopesError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new ChangesetsInvalidScopesError(
        [SCOPE_NAMES.MISSING, SCOPE_NAMES.REMOVED],
        [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      );

      expect(error.message).toEqual(
        `Unknown scopes "${SCOPE_NAMES.MISSING}", "${SCOPE_NAMES.REMOVED}". Known scopes: ${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA}`,
      );
      expect(error.name).toEqual("ChangesetsInvalidScopesError");
      expect(error.scopeNames).toEqual([SCOPE_NAMES.MISSING, SCOPE_NAMES.REMOVED]);
      expect(error.knownScopeNames).toEqual([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]);
    });
  });
});

describe("ChangesetsInvalidLevelError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new ChangesetsInvalidLevelError("huge");

      expect(error.message).toEqual('Unknown level "huge". Known levels: patch, minor, major');
      expect(error.name).toEqual("ChangesetsInvalidLevelError");
      expect(error.level).toEqual("huge");
    });
  });
});

describe("ChangesetsMissingFrontmatterError", () => {
  describe("constructor", () => {
    it("should construct with its message and name", () => {
      const error = new ChangesetsMissingFrontmatterError();

      expect(error.message).toEqual("Changeset has no frontmatter block");
      expect(error.name).toEqual("ChangesetsMissingFrontmatterError");
    });
  });
});

describe("ChangesetsMissingFieldError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new ChangesetsMissingFieldError("message");

      expect(error.message).toEqual("Changeset has no message");
      expect(error.name).toEqual("ChangesetsMissingFieldError");
      expect(error.field).toEqual("message");
    });
  });
});

describe("ChangesetsInvalidFileError", () => {
  describe("constructor", () => {
    it("should construct with its message, name, properties and cause", () => {
      const cause = new ChangesetsMissingFieldError("level");
      const error = new ChangesetsInvalidFileError("a.md", cause);

      expect(error.message).toEqual('Invalid changeset file "a.md": Changeset has no level');
      expect(error.name).toEqual("ChangesetsInvalidFileError");
      expect(error.filePath).toEqual("a.md");
      expect(error.cause).toEqual(cause);
    });
  });
});
