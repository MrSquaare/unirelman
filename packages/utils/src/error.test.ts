import { describe, expect, it } from "vitest";

import { isErrnoException, resolveErrorMessage } from "./error";

describe("isErrnoException", () => {
  it("should return true for an error with a code property", () => {
    const error: NodeJS.ErrnoException = new Error("alpha");
    error.code = "ETEST";

    expect(isErrnoException(error)).toEqual(true);
  });

  it("should return false for null", () => {
    expect(isErrnoException(null)).toEqual(false);
  });

  it("should return false for undefined", () => {
    expect(isErrnoException(undefined)).toEqual(false);
  });

  it("should return false for an error without a code property", () => {
    const error = new Error("alpha");

    expect(isErrnoException(error)).toEqual(false);
  });

  it("should return false for an error with a non-string code property", () => {
    const error = { code: 42 };

    expect(isErrnoException(error)).toEqual(false);
  });
});

describe("resolveErrorMessage", () => {
  it("should return the message of an error", () => {
    expect(resolveErrorMessage(new Error("alpha"))).toEqual("alpha");
  });

  it("should return the string form of a non-error value", () => {
    expect(resolveErrorMessage(42)).toEqual("42");
  });
});
