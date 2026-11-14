import { describe, expect, it } from "vitest";

import { ReplaceError, ReplaceNoMatchError, ReplaceUnknownScopeError } from "./errors";

describe("ReplaceError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ReplaceError("replace failure");

      expect(error.message).toEqual("replace failure");
      expect(error.name).toEqual("ReplaceError");
    });
  });
});

describe("ReplaceUnknownScopeError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ReplaceUnknownScopeError("README.md", "@scope/missing");

      expect(error.message).toEqual(
        'Replace entry of "README.md" names scope "@scope/missing", which is not a scope of the plugin',
      );
      expect(error.name).toEqual("ReplaceUnknownScopeError");
      expect(error.filePath).toEqual("README.md");
      expect(error.scopeName).toEqual("@scope/missing");
    });
  });
});

describe("ReplaceNoMatchError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const search = /my-package@\S+/;
      const error = new ReplaceNoMatchError("README.md", search);

      expect(error.message).toEqual('File "README.md" has no match for /my-package@\\S+/');
      expect(error.name).toEqual("ReplaceNoMatchError");
      expect(error.filePath).toEqual("README.md");
      expect(error.search).toEqual(search);
    });
  });
});
