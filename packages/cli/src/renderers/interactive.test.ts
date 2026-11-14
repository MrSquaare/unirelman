import { mockedFormatCommandError } from "./error.mock";
import { mockedWriteError, mockedWriteOutput } from "./stream.mock";

import {
  CANCEL_SYMBOL,
  mockedCancel,
  mockedIntro,
  mockedIsCancel,
  mockedLogError,
  mockedLogInfo,
  mockedLogMessage,
  mockedLogWarn,
  mockedMultiselect,
  mockedOutro,
  mockedSelect,
  mockedSpinner,
  mockedText,
} from "@unirelman/testing/mocks/clack/prompts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CLIPromptCancelledError } from "../errors";
import * as thisMod from "./interactive";
import {
  createInteractiveCommandUI,
  createInteractiveLogger,
  createInteractiveProgress,
  createInteractiveRenderer,
  resolvePromptValue,
} from "./interactive";

const stderr = process.stderr;

const scopeOptions = [
  { value: { name: "a" }, label: "a" },
  { value: { name: "b" }, label: "b" },
];

describe("createInteractiveProgress", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should report not started before start", () => {
    expect(createInteractiveProgress().hasStarted()).toEqual(false);
  });

  it("should report started after start, even once stopped", () => {
    const progress = createInteractiveProgress();

    progress.start("Versioning");
    progress.stop();

    expect(progress.hasStarted()).toEqual(true);
  });

  it("should write a spacer line, then start a spinner with the message", () => {
    createInteractiveProgress().start("Versioning");

    const progressSpinner = mockedSpinner.mock.results[0]?.value;

    expect(mockedSpinner).toHaveBeenCalledTimes(1);
    expect(mockedSpinner).toHaveBeenNthCalledWith(1, {
      output: stderr,
      withGuide: false,
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    });
    expect(progressSpinner.start).toHaveBeenCalledTimes(1);
    expect(progressSpinner.start).toHaveBeenNthCalledWith(1, "Versioning");
    expect(mockedLogMessage).toHaveBeenCalledTimes(1);
    expect(mockedLogMessage).toHaveBeenNthCalledWith(1, "", { output: stderr, spacing: 0 });
  });

  it("should clear the running spinner when stopped", () => {
    const progress = createInteractiveProgress();

    progress.start("Versioning");
    progress.stop();

    const progressSpinner = mockedSpinner.mock.results[0]?.value;

    expect(progressSpinner.clear).toHaveBeenCalledTimes(1);
  });

  it("should clear the spinner, write, then restart the spinner", () => {
    const progress = createInteractiveProgress();
    const write = vi.fn();

    progress.start("Versioning");
    progress.writeAround(write);

    const progressSpinner = mockedSpinner.mock.results[0]?.value;

    expect(progressSpinner.clear).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(progressSpinner.start).toHaveBeenCalledTimes(2);
    expect(progressSpinner.start).toHaveBeenNthCalledWith(2, "Versioning");
  });

  it("should only write when no spinner is running", () => {
    const write = vi.fn();

    createInteractiveProgress().writeAround(write);

    expect(write).toHaveBeenCalledTimes(1);
    expect(mockedSpinner).not.toHaveBeenCalled();
  });

  it("should only write after the spinner is stopped", () => {
    const progress = createInteractiveProgress();
    const write = vi.fn();

    progress.start("Versioning");
    progress.stop();
    progress.writeAround(write);

    const progressSpinner = mockedSpinner.mock.results[0]?.value;

    expect(write).toHaveBeenCalledTimes(1);
    expect(progressSpinner.clear).toHaveBeenCalledTimes(1);
    expect(progressSpinner.start).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when stopped without running spinner", () => {
    createInteractiveProgress().stop();

    expect(mockedSpinner).not.toHaveBeenCalled();
  });
});

describe("resolvePromptValue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the prompt value when it is not cancelled", () => {
    expect(resolvePromptValue("fix a bug")).toEqual("fix a bug");

    expect(mockedIsCancel).toHaveBeenCalledTimes(1);
    expect(mockedIsCancel).toHaveBeenNthCalledWith(1, "fix a bug");
  });

  it("should throw a cancellation error when the prompt is cancelled", () => {
    expect(() => resolvePromptValue(CANCEL_SYMBOL)).toThrow(new CLIPromptCancelledError());

    expect(mockedIsCancel).toHaveBeenCalledTimes(1);
    expect(mockedIsCancel).toHaveBeenNthCalledWith(1, CANCEL_SYMBOL);
  });
});

describe("createInteractiveCommandUI", () => {
  const resolvePromptValueSpy = vi.spyOn(thisMod, "resolvePromptValue");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should start the progress", () => {
    const progress = createInteractiveProgress();
    const startSpy = vi.spyOn(progress, "start").mockReturnValueOnce(undefined);

    createInteractiveCommandUI(progress).progress.start("Versioning");

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenNthCalledWith(1, "Versioning");
  });

  it("should stop the progress", () => {
    const progress = createInteractiveProgress();
    const stopSpy = vi.spyOn(progress, "stop").mockReturnValueOnce(undefined);

    createInteractiveCommandUI(progress).progress.stop();

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it("should return the value of the selected option", async () => {
    const [, optionB] = scopeOptions;

    mockedSelect.mockResolvedValueOnce(optionB);

    await expect(
      createInteractiveCommandUI(createInteractiveProgress()).select({
        message: "Select a scope",
        option: "--scope",
        options: scopeOptions,
      }),
    ).resolves.toEqual({ name: "b" });

    expect(mockedSelect).toHaveBeenCalledTimes(1);
    expect(mockedSelect).toHaveBeenNthCalledWith(1, {
      message: "Select a scope",
      options: [
        { value: scopeOptions[0], label: "a" },
        { value: scopeOptions[1], label: "b" },
      ],
      output: stderr,
    });
    expect(resolvePromptValueSpy).toHaveBeenCalledTimes(1);
    expect(resolvePromptValueSpy).toHaveBeenNthCalledWith(1, optionB);
  });

  it("should throw a cancellation error when select is cancelled", async () => {
    mockedSelect.mockResolvedValueOnce(CANCEL_SYMBOL);

    await expect(
      createInteractiveCommandUI(createInteractiveProgress()).select({
        message: "Select a scope",
        option: "--scope",
        options: scopeOptions,
      }),
    ).rejects.toThrow(new CLIPromptCancelledError());

    expect(resolvePromptValueSpy).toHaveBeenCalledTimes(1);
    expect(resolvePromptValueSpy).toHaveBeenNthCalledWith(1, CANCEL_SYMBOL);
  });

  it("should return the values of the selected options", async () => {
    mockedMultiselect.mockResolvedValueOnce(scopeOptions);

    await expect(
      createInteractiveCommandUI(createInteractiveProgress()).multiselect({
        message: "Select scopes",
        option: "--scopes",
        options: scopeOptions,
      }),
    ).resolves.toEqual([{ name: "a" }, { name: "b" }]);

    expect(mockedMultiselect).toHaveBeenCalledTimes(1);
    expect(mockedMultiselect).toHaveBeenNthCalledWith(1, {
      message: "Select scopes",
      options: [
        { value: scopeOptions[0], label: "a" },
        { value: scopeOptions[1], label: "b" },
      ],
      required: true,
      output: stderr,
    });
    expect(resolvePromptValueSpy).toHaveBeenCalledTimes(1);
    expect(resolvePromptValueSpy).toHaveBeenNthCalledWith(1, scopeOptions);
  });

  it("should throw a cancellation error when multiselect is cancelled", async () => {
    mockedMultiselect.mockResolvedValueOnce(CANCEL_SYMBOL);

    await expect(
      createInteractiveCommandUI(createInteractiveProgress()).multiselect({
        message: "Select scopes",
        option: "--scopes",
        options: scopeOptions,
      }),
    ).rejects.toThrow(new CLIPromptCancelledError());

    expect(resolvePromptValueSpy).toHaveBeenCalledTimes(1);
    expect(resolvePromptValueSpy).toHaveBeenNthCalledWith(1, CANCEL_SYMBOL);
  });

  it("should return the entered text", async () => {
    mockedText.mockResolvedValueOnce("fix a bug");

    await expect(
      createInteractiveCommandUI(createInteractiveProgress()).text({
        message: "Message",
        option: "--message",
      }),
    ).resolves.toEqual("fix a bug");

    expect(mockedText).toHaveBeenCalledTimes(1);
    expect(mockedText).toHaveBeenNthCalledWith(1, {
      message: "Message",
      validate: undefined,
      output: stderr,
    });
    expect(resolvePromptValueSpy).toHaveBeenCalledTimes(1);
    expect(resolvePromptValueSpy).toHaveBeenNthCalledWith(1, "fix a bug");
  });

  it("should validate entered text with the prompt validator", async () => {
    const validate = vi.fn((value: string) => (value === "" ? "Required" : undefined));

    mockedText.mockResolvedValueOnce("fix a bug");

    await createInteractiveCommandUI(createInteractiveProgress()).text({
      message: "Message",
      option: "--message",
      validate,
    });

    const textValidate = mockedText.mock.calls[0]?.[0].validate as (
      value: string | undefined,
    ) => string | undefined;

    expect(textValidate("fix a bug")).toEqual(undefined);
    expect(textValidate(undefined)).toEqual("Required");
    expect(validate).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenNthCalledWith(1, "fix a bug");
    expect(validate).toHaveBeenNthCalledWith(2, "");
  });
});

describe("createInteractiveLogger", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should log debug message with source around progress when verbose", () => {
    const progress = createInteractiveProgress();
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    createInteractiveLogger("pipeline", true, progress).debug("Starting phase");

    expect(writeAroundSpy).toHaveBeenCalledTimes(1);
    expect(mockedLogMessage).toHaveBeenCalledTimes(1);
    expect(mockedLogMessage).toHaveBeenNthCalledWith(1, "pipeline: Starting phase", {
      output: stderr,
      spacing: 0,
    });
  });

  it("should log info message with source around progress when verbose", () => {
    const progress = createInteractiveProgress();
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    createInteractiveLogger("git", true, progress).info("Committed");

    expect(writeAroundSpy).toHaveBeenCalledTimes(1);
    expect(mockedLogInfo).toHaveBeenCalledTimes(1);
    expect(mockedLogInfo).toHaveBeenNthCalledWith(1, "git: Committed", {
      output: stderr,
      spacing: 0,
    });
  });

  it("should log warning with source around progress", () => {
    const progress = createInteractiveProgress();
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    createInteractiveLogger("changesets", false, progress).warn("Invalid file");

    expect(writeAroundSpy).toHaveBeenCalledTimes(1);
    expect(mockedLogWarn).toHaveBeenCalledTimes(1);
    expect(mockedLogWarn).toHaveBeenNthCalledWith(1, "changesets: Invalid file", {
      output: stderr,
      spacing: 0,
    });
  });

  it("should not log debug message when not verbose", () => {
    const progress = createInteractiveProgress();
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    createInteractiveLogger("pipeline", false, progress).debug("Starting phase");

    expect(writeAroundSpy).not.toHaveBeenCalled();
    expect(mockedLogMessage).not.toHaveBeenCalled();
  });

  it("should not log info message when not verbose", () => {
    const progress = createInteractiveProgress();
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    createInteractiveLogger("git", false, progress).info("Committed");

    expect(writeAroundSpy).not.toHaveBeenCalled();
    expect(mockedLogInfo).not.toHaveBeenCalled();
  });
});

describe("createInteractiveRenderer", () => {
  const createInteractiveProgressSpy = vi.spyOn(thisMod, "createInteractiveProgress");
  const createInteractiveCommandUISpy = vi.spyOn(thisMod, "createInteractiveCommandUI");
  const createInteractiveLoggerSpy = vi.spyOn(thisMod, "createInteractiveLogger");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should expose interactive command UI sharing the renderer progress", () => {
    const renderer = createInteractiveRenderer({ verbose: false });

    expect(createInteractiveCommandUISpy).toHaveBeenCalledTimes(1);
    expect(createInteractiveCommandUISpy).toHaveBeenNthCalledWith(
      1,
      createInteractiveProgressSpy.mock.results[0]?.value,
    );
    expect(renderer.ui).toEqual(createInteractiveCommandUISpy.mock.results[0]?.value);
  });

  it("should create interactive logger sharing the renderer progress", () => {
    const logger = createInteractiveRenderer({ verbose: true }).createLogger("git");
    const progress = createInteractiveProgressSpy.mock.results[0]?.value;

    expect(createInteractiveProgressSpy).toHaveBeenCalledTimes(1);
    expect(createInteractiveLoggerSpy).toHaveBeenCalledTimes(1);
    expect(createInteractiveLoggerSpy).toHaveBeenNthCalledWith(1, "git", true, progress);
    expect(logger).toEqual(createInteractiveLoggerSpy.mock.results[0]?.value);
  });

  it("should print text on standard output", () => {
    createInteractiveRenderer({ verbose: false }).print("1.2.3");

    expect(mockedWriteOutput).toHaveBeenCalledTimes(1);
    expect(mockedWriteOutput).toHaveBeenNthCalledWith(1, "1.2.3");
  });

  it("should print text on standard error", () => {
    createInteractiveRenderer({ verbose: false }).printError(
      "Usage: unirelman <command> [options]",
    );

    expect(mockedWriteError).toHaveBeenCalledTimes(1);
    expect(mockedWriteError).toHaveBeenNthCalledWith(1, "Usage: unirelman <command> [options]");
  });

  it("should render intro with the CLI name and title", () => {
    createInteractiveRenderer({ verbose: false }).intro("Create changeset");

    expect(mockedIntro).toHaveBeenCalledTimes(1);
    expect(mockedIntro).toHaveBeenNthCalledWith(1, "unirelman · Create changeset", {
      output: stderr,
    });
  });

  it("should render nothing for the result", () => {
    createInteractiveRenderer({ verbose: false }).result({ path: "a.md" });

    expect(mockedLogMessage).not.toHaveBeenCalled();
  });

  it("should render the success message as outro when the summary is empty", () => {
    createInteractiveRenderer({ verbose: false }).success({
      summary: [],
      message: "Changeset created",
    });

    expect(mockedLogMessage).not.toHaveBeenCalled();
    expect(mockedOutro).toHaveBeenCalledTimes(1);
    expect(mockedOutro).toHaveBeenNthCalledWith(1, "Changeset created", { output: stderr });
  });

  it("should render the success summary as a block with a spacer line when progress never started", () => {
    const renderer = createInteractiveRenderer({ verbose: false });

    vi.spyOn(createInteractiveProgressSpy.mock.results[0]?.value, "hasStarted").mockReturnValueOnce(
      false,
    );

    renderer.success({
      summary: ["@scope/a: 1.0.0 → 1.0.1", "@scope/b: 2.0.0 → 2.1.0"],
      message: "Done",
    });

    expect(mockedLogMessage).toHaveBeenCalledTimes(1);
    expect(mockedLogMessage).toHaveBeenNthCalledWith(
      1,
      "@scope/a: 1.0.0 → 1.0.1\n@scope/b: 2.0.0 → 2.1.0",
      { output: stderr, spacing: 1 },
    );
    expect(mockedOutro).toHaveBeenCalledTimes(1);
    expect(mockedOutro).toHaveBeenNthCalledWith(1, "Done", { output: stderr });
  });

  it("should render the success summary without a spacer line when progress started", () => {
    const renderer = createInteractiveRenderer({ verbose: false });

    vi.spyOn(createInteractiveProgressSpy.mock.results[0]?.value, "hasStarted").mockReturnValueOnce(
      true,
    );

    renderer.success({ summary: ["@scope/a: 1.0.0 → 1.0.1"], message: "Done" });

    expect(mockedLogMessage).toHaveBeenCalledTimes(1);
    expect(mockedLogMessage).toHaveBeenNthCalledWith(1, "@scope/a: 1.0.0 → 1.0.1", {
      output: stderr,
      spacing: 0,
    });
    expect(mockedOutro).toHaveBeenCalledTimes(1);
    expect(mockedOutro).toHaveBeenNthCalledWith(1, "Done", { output: stderr });
  });

  it("should render cancellation", () => {
    createInteractiveRenderer({ verbose: false }).cancel("Operation cancelled.");

    expect(mockedCancel).toHaveBeenCalledTimes(1);
    expect(mockedCancel).toHaveBeenNthCalledWith(1, "Operation cancelled.", { output: stderr });
  });

  it("should render error around progress with a spacer line when progress never started", () => {
    const renderer = createInteractiveRenderer({ verbose: false });
    const progress = createInteractiveProgressSpy.mock.results[0]?.value;
    const writeAroundSpy = vi.spyOn(progress, "writeAround");

    const error = new Error("Something failed");

    vi.spyOn(progress, "hasStarted").mockReturnValueOnce(false);

    renderer.error(error);

    expect(writeAroundSpy).toHaveBeenCalledTimes(1);
    expect(mockedFormatCommandError).toHaveBeenCalledTimes(1);
    expect(mockedFormatCommandError).toHaveBeenNthCalledWith(1, error, false);
    expect(mockedLogError).toHaveBeenCalledTimes(1);
    expect(mockedLogError).toHaveBeenNthCalledWith(1, "Something failed", {
      output: stderr,
      spacing: 1,
    });
  });

  it("should render error around progress without a spacer line when progress started", () => {
    const renderer = createInteractiveRenderer({ verbose: false });
    const progress = createInteractiveProgressSpy.mock.results[0]?.value;

    vi.spyOn(progress, "hasStarted").mockReturnValueOnce(true);

    renderer.error(new Error("Something failed"));

    expect(mockedLogError).toHaveBeenCalledTimes(1);
    expect(mockedLogError).toHaveBeenNthCalledWith(1, "Something failed", {
      output: stderr,
      spacing: 0,
    });
  });
  it("should render the failure message as outro", () => {
    createInteractiveRenderer({ verbose: false }).failure("❌ The command failed.");

    expect(mockedOutro).toHaveBeenCalledTimes(1);
    expect(mockedOutro).toHaveBeenNthCalledWith(1, "❌ The command failed.", { output: stderr });
  });
});
