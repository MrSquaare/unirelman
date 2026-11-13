import { afterEach, describe, expect, it, vi } from "vitest";

import { CleanupError, runWithCleanup } from "./cleanup";

describe("CleanupError", () => {
  describe("constructor", () => {
    it("should construct CleanupError with both errors, message and cause", () => {
      const error = new Error("task failed");
      const cleanupError = new Error("cleanup failed");

      const cleanup = new CleanupError(error, cleanupError);

      expect(cleanup).toEqual(
        Object.assign(
          new AggregateError([error, cleanupError], "task failed\nCleanup failed: cleanup failed"),
          {
            name: "CleanupError",
            error,
            cleanupError,
          },
        ),
      );
      expect(cleanup.cause).toEqual(error);
    });

    it("should construct CleanupError message from non-error values", () => {
      const cleanup = new CleanupError("task failed", 42);

      expect(cleanup.message).toEqual("task failed\nCleanup failed: 42");
    });
  });
});

describe("runWithCleanup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the task result after running cleanup without error", async () => {
    const task = vi.fn().mockResolvedValueOnce("result");
    const cleanup = vi.fn().mockResolvedValueOnce(undefined);

    await expect(runWithCleanup(task, cleanup)).resolves.toEqual("result");

    expect(task).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenNthCalledWith(1);
  });

  it("should run cleanup with the task error, then rethrow it", async () => {
    const error = new Error("task failed");
    const task = vi.fn().mockRejectedValueOnce(error);
    const cleanup = vi.fn().mockResolvedValueOnce(undefined);

    await expect(runWithCleanup(task, cleanup)).rejects.toThrow(error);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenNthCalledWith(1, error);
  });

  it("should throw CleanupError with both errors when cleanup fails after a task error", async () => {
    const error = new Error("task failed");
    const cleanupError = new Error("cleanup failed");
    const task = vi.fn().mockRejectedValueOnce(error);
    const cleanup = vi.fn().mockRejectedValueOnce(cleanupError);

    await expect(runWithCleanup(task, cleanup)).rejects.toThrow(
      new CleanupError(error, cleanupError),
    );

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenNthCalledWith(1, error);
  });

  it("should throw the cleanup error when cleanup fails after a successful task", async () => {
    const cleanupError = new Error("cleanup failed");
    const task = vi.fn().mockResolvedValueOnce("result");
    const cleanup = vi.fn().mockRejectedValueOnce(cleanupError);

    await expect(runWithCleanup(task, cleanup)).rejects.toThrow(cleanupError);
  });
});
