import { describe, expect, it } from "vitest";

import {
  VersioningError,
  VersioningFixedVersionMismatchError,
  VersioningInvalidVersionError,
  VersioningMissingCurrentVersionError,
} from "./errors";

describe("VersioningError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new VersioningError("versioning failure");

      expect(error.message).toEqual("versioning failure");
      expect(error.name).toEqual("VersioningError");
    });

    it("should construct with a cause", () => {
      const cause = new Error("root cause");
      const error = new VersioningError("versioning failure", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("VersioningInvalidVersionError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new VersioningInvalidVersionError("semver", "invalid");

      expect(error.message).toEqual("Invalid semver version: invalid");
      expect(error.name).toEqual("VersioningInvalidVersionError");
      expect(error.schemeName).toEqual("semver");
      expect(error.value).toEqual("invalid");
    });
  });
});

describe("VersioningFixedVersionMismatchError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new VersioningFixedVersionMismatchError({
        "@scope/a": "0.1.0",
        "@scope/b": undefined,
      });

      expect(error.message).toEqual(
        "Fixed scopes must share the same current version: @scope/a (0.1.0), @scope/b (no version)",
      );
      expect(error.name).toEqual("VersioningFixedVersionMismatchError");
      expect(error.currentVersions).toEqual({ "@scope/a": "0.1.0", "@scope/b": undefined });
    });
  });
});

describe("VersioningMissingCurrentVersionError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new VersioningMissingCurrentVersionError(["@scope/a", "@scope/b"]);

      expect(error.message).toEqual(
        "Scopes with changes have no current version: @scope/a, @scope/b",
      );
      expect(error.name).toEqual("VersioningMissingCurrentVersionError");
      expect(error.scopeNames).toEqual(["@scope/a", "@scope/b"]);
    });
  });
});
