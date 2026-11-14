import { mockedCreateMainCommand } from "./commands/main.mock";
import { mockedParseCommandLine } from "./helpers/command-line.mock";
import { mockedRunCommandLine } from "./helpers/dispatch.mock";
import { mockedReportCommandError } from "./helpers/execution.mock";
import {
  mockedCreateRenderer,
  mockedReadTerminalState,
  mockedResolveOutputMode,
} from "./renderers/index.mock";
import { mockedCreatePlainRenderer } from "./renderers/plain.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import packageJson from "../package.json" with { type: "json" };
import { CLIConflictingOutputModesError } from "./errors";
import { createCommandLine, createGlobalOptions } from "./helpers/command-line.fixture";
import * as thisMod from "./run";
import { runCLI, runMainCommand } from "./run";
import { MockRenderer } from "./testing/mocks/renderer";

describe("runMainCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create renderer and main command, then run the command line", async () => {
    const args = ["version", "--verbose"];
    const commandLine = createCommandLine({
      options: createGlobalOptions({ verbose: true }),
      tokens: [{ kind: "positional", value: "version" }],
    });
    const renderer = new MockRenderer();
    const command = {
      meta: { name: "unirelman", description: "Universal Release Manager CLI" },
      subCommands: {},
    };

    mockedReadTerminalState.mockReturnValueOnce({ stdin: true, stderr: true });
    mockedCreateRenderer.mockReturnValueOnce(renderer);
    mockedCreateMainCommand.mockResolvedValueOnce(command);
    mockedRunCommandLine.mockResolvedValueOnce(undefined);

    await expect(runMainCommand(args, commandLine)).resolves.toEqual(undefined);

    expect(mockedReadTerminalState).toHaveBeenCalledTimes(1);
    expect(mockedResolveOutputMode).toHaveBeenCalledTimes(1);
    expect(mockedResolveOutputMode).toHaveBeenNthCalledWith(1, undefined, {
      stdin: true,
      stderr: true,
    });
    expect(mockedCreateRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreateRenderer).toHaveBeenNthCalledWith(1, "interactive", true);
    expect(mockedCreateMainCommand).toHaveBeenCalledTimes(1);
    expect(mockedCreateMainCommand).toHaveBeenNthCalledWith(1, commandLine.options, renderer);
    expect(mockedRunCommandLine).toHaveBeenCalledTimes(1);
    expect(mockedRunCommandLine).toHaveBeenNthCalledWith(1, command, args, commandLine, renderer);
    expect(mockedReportCommandError).not.toHaveBeenCalled();
  });

  it("should print the version without loading the configuration", async () => {
    const renderer = new MockRenderer();

    mockedReadTerminalState.mockReturnValueOnce({ stdin: false, stderr: false });
    mockedCreateRenderer.mockReturnValueOnce(renderer);

    await expect(
      runMainCommand(
        ["--version"],
        createCommandLine({ options: createGlobalOptions({ version: true }) }),
      ),
    ).resolves.toEqual(undefined);

    expect(renderer.print).toHaveBeenCalledTimes(1);
    expect(renderer.print).toHaveBeenNthCalledWith(1, packageJson.version);
    expect(mockedCreateMainCommand).not.toHaveBeenCalled();
    expect(mockedRunCommandLine).not.toHaveBeenCalled();
  });

  it("should report error through renderer when main command creation fails", async () => {
    const renderer = new MockRenderer();
    const error = new Error("Failed to create main command");

    mockedReadTerminalState.mockReturnValueOnce({ stdin: true, stderr: true });
    mockedCreateRenderer.mockReturnValueOnce(renderer);
    mockedCreateMainCommand.mockRejectedValueOnce(error);

    await expect(
      runMainCommand(
        ["version"],
        createCommandLine({ options: createGlobalOptions({ outputMode: "plain" }) }),
      ),
    ).resolves.toEqual(undefined);

    expect(mockedCreateRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreateRenderer).toHaveBeenNthCalledWith(1, "plain", false);
    expect(mockedRunCommandLine).not.toHaveBeenCalled();
    expect(mockedReportCommandError).toHaveBeenCalledTimes(1);
    expect(mockedReportCommandError).toHaveBeenNthCalledWith(1, renderer, error);
  });
});

describe("runCLI", () => {
  const runMainCommandSpy = vi.spyOn(thisMod, "runMainCommand");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse the command line and run main command", async () => {
    const args = ["--plain", "version"];
    const commandLine = createCommandLine({
      options: createGlobalOptions({ outputMode: "plain" }),
      tokens: [{ kind: "positional", value: "version" }],
    });

    mockedParseCommandLine.mockReturnValueOnce(commandLine);
    runMainCommandSpy.mockResolvedValueOnce(undefined);

    await expect(runCLI(args)).resolves.toEqual(undefined);

    expect(mockedParseCommandLine).toHaveBeenCalledTimes(1);
    expect(mockedParseCommandLine).toHaveBeenNthCalledWith(1, args);
    expect(runMainCommandSpy).toHaveBeenCalledTimes(1);
    expect(runMainCommandSpy).toHaveBeenNthCalledWith(1, args, commandLine);
    expect(mockedCreatePlainRenderer).not.toHaveBeenCalled();
    expect(mockedReportCommandError).not.toHaveBeenCalled();
  });

  it("should report error through a plain renderer when global options are invalid", async () => {
    const args = ["--plain", "--json", "version"];
    const renderer = new MockRenderer();
    const error = new CLIConflictingOutputModesError(["--plain", "--json"]);

    mockedParseCommandLine.mockImplementationOnce(() => {
      throw error;
    });
    mockedCreatePlainRenderer.mockReturnValueOnce(renderer);

    await expect(runCLI(args)).resolves.toEqual(undefined);

    expect(mockedParseCommandLine).toHaveBeenCalledTimes(1);
    expect(mockedParseCommandLine).toHaveBeenNthCalledWith(1, args);
    expect(runMainCommandSpy).not.toHaveBeenCalled();
    expect(mockedCreatePlainRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreatePlainRenderer).toHaveBeenNthCalledWith(1, { verbose: false });
    expect(mockedReportCommandError).toHaveBeenCalledTimes(1);
    expect(mockedReportCommandError).toHaveBeenNthCalledWith(1, renderer, error);
  });
});
