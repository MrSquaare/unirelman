import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./error";
import { formatCommandError } from "./error";

describe("formatCommandError", () => {
  const formatCommandErrorSpy = vi.spyOn(thisMod, "formatCommandError");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return error message when verbose is disabled", () => {
    const error = new Error("Something failed");

    expect(formatCommandError(error, false)).toEqual("Something failed");
  });

  it("should return error stack when verbose is enabled", () => {
    const error = new Error("Something failed");

    error.stack = "Error: Something failed\n    at test";

    expect(formatCommandError(error, true)).toEqual("Error: Something failed\n    at test");
  });

  it("should return error message when verbose is enabled and stack is missing", () => {
    const error = new Error("Something failed");

    error.stack = undefined;

    expect(formatCommandError(error, true)).toEqual("Something failed");
  });

  it("should return the stacks of the error and its causes when verbose is enabled", () => {
    const cause = new Error("npm could not authenticate");
    const error = new Error('Plugin "npm" failed in the publish phase', { cause });

    cause.stack = "Error: npm could not authenticate\n    at publish";
    error.stack = 'Error: Plugin "npm" failed in the publish phase\n    at executePhase';

    expect(formatCommandError(error, true)).toEqual(
      'Error: Plugin "npm" failed in the publish phase\n    at executePhase\nCaused by: Error: npm could not authenticate\n    at publish',
    );
    expect(formatCommandErrorSpy).toHaveBeenCalledTimes(2);
    expect(formatCommandErrorSpy).toHaveBeenNthCalledWith(2, cause, true);
  });

  it("should return stringified value when error is not an Error", () => {
    expect(formatCommandError("Something failed", false)).toEqual("Something failed");
  });
});
