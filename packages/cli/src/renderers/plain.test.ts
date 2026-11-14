import { mockedFormatCommandError } from "./error.mock";
import { mockedWriteError, mockedWriteOutput } from "./stream.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CLIPromptUnavailableError } from "../errors";
import * as thisMod from "./plain";
import { createPlainCommandUI, createPlainLogger, createPlainRenderer } from "./plain";

describe("createPlainCommandUI", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write nothing when progress starts", () => {
    createPlainCommandUI().progress.start("Versioning");

    expect(mockedWriteError).not.toHaveBeenCalled();
  });

  it("should write nothing when progress stops", () => {
    createPlainCommandUI().progress.stop();

    expect(mockedWriteError).not.toHaveBeenCalled();
  });

  it("should reject select prompt with the option to provide", async () => {
    await expect(
      createPlainCommandUI().select({
        message: "Select a scope",
        option: "--scope",
        options: [{ value: "a", label: "a" }],
      }),
    ).rejects.toThrow(new CLIPromptUnavailableError("--scope"));
  });

  it("should reject multiselect prompt with the option to provide", async () => {
    await expect(
      createPlainCommandUI().multiselect({
        message: "Select scopes",
        option: "--scopes",
        options: [{ value: "a", label: "a" }],
      }),
    ).rejects.toThrow(new CLIPromptUnavailableError("--scopes"));
  });

  it("should reject text prompt with the option to provide", async () => {
    await expect(
      createPlainCommandUI().text({
        message: "Message",
        option: "--message",
      }),
    ).rejects.toThrow(new CLIPromptUnavailableError("--message"));
  });
});

describe("createPlainLogger", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write debug message prefixed with source when verbose", () => {
    createPlainLogger("pipeline", true).debug("Starting phase");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "pipeline: Starting phase");
  });

  it("should write info message prefixed with source when verbose", () => {
    createPlainLogger("git", true).info("Committed");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "git: Committed");
  });

  it("should write warning prefixed with source", () => {
    createPlainLogger("changesets", false).warn("Invalid file");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "changesets: warning: Invalid file");
  });

  it("should not write debug message when not verbose", () => {
    createPlainLogger("pipeline", false).debug("Starting phase");

    expect(mockedWriteError).not.toHaveBeenCalled();
  });

  it("should not write info message when not verbose", () => {
    createPlainLogger("git", false).info("Committed");

    expect(mockedWriteError).not.toHaveBeenCalled();
  });
});

describe("createPlainRenderer", () => {
  const createPlainLoggerSpy = vi.spyOn(thisMod, "createPlainLogger");
  const createPlainCommandUISpy = vi.spyOn(thisMod, "createPlainCommandUI");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should expose plain command UI", () => {
    const renderer = createPlainRenderer({ verbose: false });

    expect(createPlainCommandUISpy).toHaveBeenCalledTimes(1);
    expect(renderer.ui).toEqual(createPlainCommandUISpy.mock.results[0]?.value);
  });

  it("should create plain logger for source with verbose option", () => {
    const logger = createPlainRenderer({ verbose: true }).createLogger("git");

    expect(createPlainLoggerSpy).toHaveBeenCalledTimes(1);
    expect(createPlainLoggerSpy).toHaveBeenNthCalledWith(1, "git", true);
    expect(logger).toEqual(createPlainLoggerSpy.mock.results[0]?.value);
  });

  it("should print text on standard output", () => {
    createPlainRenderer({ verbose: false }).print("1.2.3");

    expect(mockedWriteOutput).toHaveBeenCalledTimes(1);
    expect(mockedWriteOutput).toHaveBeenNthCalledWith(1, "1.2.3");
  });

  it("should print text on standard error", () => {
    createPlainRenderer({ verbose: false }).printError("Usage: unirelman <command> [options]");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "Usage: unirelman <command> [options]");
  });

  it("should write intro with the CLI name and title as a line", () => {
    createPlainRenderer({ verbose: false }).intro("Create changeset");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "unirelman · Create changeset");
  });

  it("should write each success summary line, then the success message", () => {
    createPlainRenderer({ verbose: false }).success({
      summary: ["@scope/a: 1.0.0 → 1.0.1"],
      message: "Done",
    });

    expect(mockedWriteError).toHaveBeenCalledTimes(2);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "@scope/a: 1.0.0 → 1.0.1");
    expect(mockedWriteError).toHaveBeenNthCalledWith(2, "Done");
  });

  it("should write cancellation message as a line", () => {
    createPlainRenderer({ verbose: false }).cancel("Operation cancelled.");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "Operation cancelled.");
  });

  it("should write the formatted error prefixed with error", () => {
    const error = new Error("Something failed");

    createPlainRenderer({ verbose: true }).error(error);

    expect(mockedFormatCommandError).toHaveBeenCalledTimes(1);
    expect(mockedFormatCommandError).toHaveBeenNthCalledWith(1, error, true);
    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(
      1,
      `error: ${mockedFormatCommandError.mock.results[0]?.value}`,
    );
  });

  it("should write nothing for the result", () => {
    createPlainRenderer({ verbose: false }).result({ path: "a.md" });

    expect(mockedWriteError).not.toHaveBeenCalled();
  });

  it("should write failure message as a line", () => {
    createPlainRenderer({ verbose: false }).failure("❌ The command failed.");

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "❌ The command failed.");
  });
});
