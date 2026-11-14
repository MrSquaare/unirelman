import { describe, expect, it } from "vitest";

import {
  ChangelogError,
  ChangelogInvalidHeaderError,
  ChangelogInvalidLevelHeaderError,
  ChangelogInvalidSectionHeaderError,
} from "./errors";

describe("ChangelogError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ChangelogError("changelog failure");

      expect(error.message).toEqual("changelog failure");
      expect(error.name).toEqual("ChangelogError");
    });
  });
});

describe("ChangelogInvalidHeaderError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ChangelogInvalidHeaderError("# History\n## Intro");

      expect(error.message).toEqual(
        'Changelog header contains a "## " section heading: # History\n## Intro',
      );
      expect(error.name).toEqual("ChangelogInvalidHeaderError");
      expect(error.header).toEqual("# History\n## Intro");
    });
  });
});

describe("ChangelogInvalidLevelHeaderError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ChangelogInvalidLevelHeaderError("patch", "Fixes\n## 1.0.0");

      expect(error.message).toEqual(
        'Changelog level header of "patch" is not one line: Fixes\n## 1.0.0',
      );
      expect(error.name).toEqual("ChangelogInvalidLevelHeaderError");
      expect(error.level).toEqual("patch");
      expect(error.levelHeader).toEqual("Fixes\n## 1.0.0");
    });
  });
});

describe("ChangelogInvalidSectionHeaderError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new ChangelogInvalidSectionHeaderError("# 1.0.1");

      expect(error.message).toEqual(
        'Changelog section header is not one line starting with "## ": # 1.0.1',
      );
      expect(error.name).toEqual("ChangelogInvalidSectionHeaderError");
      expect(error.sectionHeader).toEqual("# 1.0.1");
    });
  });
});
