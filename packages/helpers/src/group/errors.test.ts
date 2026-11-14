import { describe, expect, it } from "vitest";

import {
  GroupDuplicateScopeError,
  GroupEmptyError,
  GroupError,
  GroupUnknownScopeError,
} from "./errors";

describe("GroupError", () => {
  describe("constructor", () => {
    it("should construct with name and message", () => {
      const error = new GroupError("message");

      expect(error.message).toEqual("message");
      expect(error.name).toEqual("GroupError");
    });
  });
});

describe("GroupEmptyError", () => {
  describe("constructor", () => {
    it("should construct with the group name in message", () => {
      const error = new GroupEmptyError("ui");

      expect(error.message).toEqual('Group "ui" has no scope');
      expect(error.name).toEqual("GroupEmptyError");
      expect(error.groupName).toEqual("ui");
    });
  });
});

describe("GroupUnknownScopeError", () => {
  describe("constructor", () => {
    it("should construct with the group, the scope and the scopes of the plugin in message", () => {
      const error = new GroupUnknownScopeError("ui", "@scope/c", ["@scope/a", "@scope/b"]);

      expect(error.message).toEqual(
        'Unknown scope "@scope/c" in group "ui". Known scopes: @scope/a, @scope/b',
      );
      expect(error.name).toEqual("GroupUnknownScopeError");
      expect(error.groupName).toEqual("ui");
      expect(error.scopeName).toEqual("@scope/c");
      expect(error.knownScopeNames).toEqual(["@scope/a", "@scope/b"]);
    });
  });
});

describe("GroupDuplicateScopeError", () => {
  describe("constructor", () => {
    it("should construct with the scope in message", () => {
      const error = new GroupDuplicateScopeError("@scope/a");

      expect(error.message).toEqual('Scope "@scope/a" is in more than one group');
      expect(error.name).toEqual("GroupDuplicateScopeError");
      expect(error.scopeName).toEqual("@scope/a");
    });
  });
});
