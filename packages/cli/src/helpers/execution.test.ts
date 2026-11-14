import { afterEach, describe, expect, it, vi } from "vitest";

import type { LeafCommand } from "../types/command";

import { CLIPromptCancelledError } from "../errors";
import { MockRenderer } from "../testing/mocks/renderer";
import * as thisMod from "./execution";
import { failCommand, reportCommandError, runCommand } from "./execution";

describe("failCommand", () => {
  afterEach(() => {
    process.exitCode = undefined;

    vi.clearAllMocks();
  });

  it("should set the failure exit code", () => {
    failCommand();

    expect(process.exitCode).toEqual(1);
  });
});

describe("reportCommandError", () => {
  const failCommandSpy = vi.spyOn(thisMod, "failCommand");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the error and fail the command", () => {
    const renderer = new MockRenderer();
    const error = new Error("Something failed");

    failCommandSpy.mockReturnValueOnce(undefined);

    reportCommandError(renderer, error);

    expect(renderer.error).toHaveBeenCalledTimes(1);
    expect(renderer.error).toHaveBeenNthCalledWith(1, error);
    expect(failCommandSpy).toHaveBeenCalledTimes(1);
    expect(failCommandSpy).toHaveBeenNthCalledWith(1);
  });
});

describe("runCommand", () => {
  const reportCommandErrorSpy = vi.spyOn(thisMod, "reportCommandError");

  afterEach(() => {
    process.exitCode = undefined;

    vi.clearAllMocks();
  });

  it("should render intro, run the command, then render its outro and result", async () => {
    const renderer = new MockRenderer();
    const run = vi.fn<LeafCommand["run"]>().mockResolvedValueOnce({
      result: { path: "a.md" },
      success: { summary: [], message: "Changeset created" },
    });
    const command: LeafCommand = {
      meta: { name: "create" },
      title: "Create changeset",
      options: {},
      run,
    };

    await expect(runCommand(command, { level: "patch" }, renderer)).resolves.toEqual(undefined);

    expect(renderer.intro).toHaveBeenCalledTimes(1);
    expect(renderer.intro).toHaveBeenNthCalledWith(1, "Create changeset");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenNthCalledWith(1, { values: { level: "patch" }, ui: renderer.ui });
    expect(renderer.ui.progress.stop).toHaveBeenCalledTimes(1);
    expect(renderer.success).toHaveBeenCalledTimes(1);
    expect(renderer.success).toHaveBeenNthCalledWith(1, {
      summary: [],
      message: "Changeset created",
    });
    expect(renderer.result).toHaveBeenCalledTimes(1);
    expect(renderer.result).toHaveBeenNthCalledWith(1, { path: "a.md" });
    expect(reportCommandErrorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toEqual(undefined);
  });

  it("should render cancellation and set the cancelled exit code when a prompt is cancelled", async () => {
    const renderer = new MockRenderer();
    const command: LeafCommand = {
      meta: { name: "create" },
      title: "Create changeset",
      options: {},
      run: vi.fn<LeafCommand["run"]>().mockRejectedValueOnce(new CLIPromptCancelledError()),
    };

    await expect(runCommand(command, {}, renderer)).resolves.toEqual(undefined);

    expect(renderer.ui.progress.stop).toHaveBeenCalledTimes(1);
    expect(renderer.cancel).toHaveBeenCalledTimes(1);
    expect(renderer.cancel).toHaveBeenNthCalledWith(1, "Operation cancelled");
    expect(process.exitCode).toEqual(130);
    expect(reportCommandErrorSpy).not.toHaveBeenCalled();
    expect(renderer.success).not.toHaveBeenCalled();
    expect(renderer.failure).not.toHaveBeenCalled();
    expect(renderer.result).not.toHaveBeenCalled();
  });

  it("should report the error, then render the command failure message when the command fails", async () => {
    const renderer = new MockRenderer();
    const error = new Error("pipeline failed");
    const command: LeafCommand = {
      meta: { name: "version" },
      title: "Version",
      options: {},
      run: vi.fn<LeafCommand["run"]>().mockRejectedValueOnce(error),
      failure: "❌ An error occurred during versioning.",
    };

    reportCommandErrorSpy.mockReturnValueOnce(undefined);

    await expect(runCommand(command, {}, renderer)).resolves.toEqual(undefined);

    expect(renderer.ui.progress.stop).toHaveBeenCalledTimes(1);
    expect(reportCommandErrorSpy).toHaveBeenCalledTimes(1);
    expect(reportCommandErrorSpy).toHaveBeenNthCalledWith(1, renderer, error);
    expect(renderer.failure).toHaveBeenCalledTimes(1);
    expect(renderer.failure).toHaveBeenNthCalledWith(1, "❌ An error occurred during versioning.");
    expect(renderer.cancel).not.toHaveBeenCalled();
    expect(renderer.result).not.toHaveBeenCalled();
  });

  it("should render the default failure message when the command declares none", async () => {
    const renderer = new MockRenderer();
    const command: LeafCommand = {
      meta: { name: "create" },
      title: "Create changeset",
      options: {},
      run: vi.fn<LeafCommand["run"]>().mockRejectedValueOnce(new Error("Invalid scopes")),
    };

    reportCommandErrorSpy.mockReturnValueOnce(undefined);

    await expect(runCommand(command, {}, renderer)).resolves.toEqual(undefined);

    expect(renderer.failure).toHaveBeenCalledTimes(1);
    expect(renderer.failure).toHaveBeenNthCalledWith(1, "❌ The command failed.");
  });
});
