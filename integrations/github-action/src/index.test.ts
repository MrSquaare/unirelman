import { mockedRunAction } from "./main.mock";

import { mockedSetFailed } from "@unirelman/testing/mocks/actions/core";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("index", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should run the action", async () => {
    mockedRunAction.mockResolvedValueOnce(undefined);

    await import("./index");

    expect(mockedRunAction).toHaveBeenCalledTimes(1);
    expect(mockedSetFailed).not.toHaveBeenCalled();
  });

  it("should mark the action as failed with the error", async () => {
    const error = new Error("release failed");

    mockedRunAction.mockRejectedValueOnce(error);

    await import("./index");

    expect(mockedSetFailed).toHaveBeenCalledTimes(1);
    expect(mockedSetFailed).toHaveBeenNthCalledWith(1, error);
  });

  it("should mark the action as failed with the message of a non-error value", async () => {
    mockedRunAction.mockRejectedValueOnce("release failed");

    await import("./index");

    expect(mockedSetFailed).toHaveBeenCalledTimes(1);
    expect(mockedSetFailed).toHaveBeenNthCalledWith(1, "release failed");
  });
});
