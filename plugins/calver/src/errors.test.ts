import { afterEach, describe, expect, it, vi } from "vitest";

import { CalverError, CalverFutureVersionError } from "./errors";

describe("CalverError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new CalverError("calver failure");

      expect(error.message).toEqual("calver failure");
      expect(error.name).toEqual("CalverError");
    });

    it("should construct with a cause", () => {
      const cause = new Error("root cause");
      const error = new CalverError("calver failure", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("CalverFutureVersionError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct with correct message, name and properties", () => {
      const error = new CalverFutureVersionError("2026.12.01.0", "2026.11.14");

      expect(error.message).toEqual(
        "Current version 2026.12.01.0 is dated after today (2026.11.14)",
      );
      expect(error.name).toEqual("CalverFutureVersionError");
      expect(error.version).toEqual("2026.12.01.0");
      expect(error.date).toEqual("2026.11.14");
    });
  });
});
