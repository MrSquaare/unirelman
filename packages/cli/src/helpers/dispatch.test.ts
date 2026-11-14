import { mockedParseArgv } from "./argv.mock";
import { mockedFailCommand, mockedRunCommand } from "./execution.mock";
import { mockedIsPositionalToken, mockedIsUnknownOptionToken } from "./guard.mock";
import { mockedFormatUsage } from "./usage.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommandGroup, LeafCommand } from "../types/command";

import {
  CLIReservedOptionError,
  CLIUnexpectedArgumentError,
  CLIUnknownCommandError,
  CLIUnknownOptionError,
} from "../errors";
import { MockRenderer } from "../testing/mocks/renderer";
import { createCommandLine, createGlobalOptions } from "./command-line.fixture";
import * as thisMod from "./dispatch";
import { parseLeafValues, resolveCommandTarget, runCommandLine } from "./dispatch";

const CREATE_COMMAND: LeafCommand = {
  meta: { name: "create", description: "Create a changeset" },
  title: "Create changeset",
  options: { level: { type: "string", description: "Level" } },
  run: vi.fn(),
};

const CHANGESETS_COMMAND: CommandGroup = {
  meta: { name: "changesets", description: "Manage changesets" },
  subCommands: { create: CREATE_COMMAND },
};

const GLOBAL_OPTION_DEFS = {
  verbose: { type: "boolean", alias: "v", description: "Verbose" },
} as const;

const MAIN_COMMAND: CommandGroup = {
  meta: { name: "unirelman", description: "Universal Release Manager CLI" },
  subCommands: { changesets: CHANGESETS_COMMAND },
};

describe("resolveCommandTarget", () => {
  const resolveCommandTargetSpy = vi.spyOn(thisMod, "resolveCommandTarget");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the leaf command named by the positionals", () => {
    expect(
      resolveCommandTarget(
        MAIN_COMMAND,
        [
          { kind: "positional", value: "changesets" },
          { kind: "positional", value: "create" },
        ],
        ["unirelman"],
        ["--verbose"],
      ),
    ).toEqual({ command: CREATE_COMMAND, names: ["unirelman", "changesets", "create"] });
    expect(mockedIsUnknownOptionToken).toHaveBeenCalledTimes(2);
    expect(mockedIsUnknownOptionToken).toHaveBeenNthCalledWith(1, {
      kind: "positional",
      value: "changesets",
    });
    expect(mockedIsUnknownOptionToken).toHaveBeenNthCalledWith(2, {
      kind: "positional",
      value: "create",
    });
    expect(resolveCommandTargetSpy).toHaveBeenCalledTimes(3);
    expect(resolveCommandTargetSpy).toHaveBeenNthCalledWith(
      2,
      CHANGESETS_COMMAND,
      [{ kind: "positional", value: "create" }],
      ["unirelman", "changesets"],
      ["--verbose"],
    );
    expect(resolveCommandTargetSpy).toHaveBeenNthCalledWith(
      3,
      CREATE_COMMAND,
      [],
      ["unirelman", "changesets", "create"],
      ["--verbose"],
    );
  });

  it("should stop at a leaf command and leave the remaining tokens to it", () => {
    expect(
      resolveCommandTarget(
        MAIN_COMMAND,
        [
          { kind: "positional", value: "changesets" },
          { kind: "positional", value: "create" },
          { kind: "unknownOption", rawName: "--level" },
          { kind: "positional", value: "patch" },
        ],
        ["unirelman"],
        ["--verbose"],
      ),
    ).toEqual({ command: CREATE_COMMAND, names: ["unirelman", "changesets", "create"] });
  });

  it("should stop at a command group without tokens", () => {
    expect(resolveCommandTarget(MAIN_COMMAND, [], ["unirelman"], ["--verbose"])).toEqual({
      command: MAIN_COMMAND,
      names: ["unirelman"],
    });
  });

  it("should throw on an option unknown at a command group level", () => {
    expect(() =>
      resolveCommandTarget(
        MAIN_COMMAND,
        [
          { kind: "positional", value: "changesets" },
          { kind: "unknownOption", rawName: "--scopes" },
          { kind: "positional", value: "a" },
        ],
        ["unirelman"],
        ["--verbose"],
      ),
    ).toThrow(new CLIUnknownOptionError("--scopes", ["--verbose"]));
  });

  it("should throw when a positional names no sub command", () => {
    expect(() =>
      resolveCommandTarget(
        MAIN_COMMAND,
        [{ kind: "positional", value: "nope" }],
        ["unirelman"],
        ["--verbose"],
      ),
    ).toThrow(new CLIUnknownCommandError("nope", ["changesets"]));
  });

  it("should throw when a positional names an inherited object property", () => {
    expect(() =>
      resolveCommandTarget(
        MAIN_COMMAND,
        [{ kind: "positional", value: "toString" }],
        ["unirelman"],
        ["--verbose"],
      ),
    ).toThrow(new CLIUnknownCommandError("toString", ["changesets"]));
  });
});

describe("parseLeafValues", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse the global and command options of the leaf command", () => {
    const rawArgs = ["changesets", "create", "--level", "patch", "-v"];

    expect(
      parseLeafValues(
        rawArgs,
        CREATE_COMMAND,
        ["unirelman", "changesets", "create"],
        GLOBAL_OPTION_DEFS,
      ),
    ).toEqual({ level: "patch", verbose: true });
    expect(mockedParseArgv).toHaveBeenCalledTimes(1);
    expect(mockedParseArgv).toHaveBeenNthCalledWith(1, rawArgs, {
      ...GLOBAL_OPTION_DEFS,
      ...CREATE_COMMAND.options,
    });
    expect(mockedIsUnknownOptionToken).toHaveBeenCalledTimes(2);
    expect(mockedIsUnknownOptionToken).toHaveBeenNthCalledWith(1, {
      kind: "positional",
      value: "changesets",
    });
    expect(mockedIsUnknownOptionToken).toHaveBeenNthCalledWith(2, {
      kind: "positional",
      value: "create",
    });
    expect(mockedIsPositionalToken).toHaveBeenCalledTimes(2);
    expect(mockedIsPositionalToken).toHaveBeenNthCalledWith(1, {
      kind: "positional",
      value: "changesets",
    });
    expect(mockedIsPositionalToken).toHaveBeenNthCalledWith(2, {
      kind: "positional",
      value: "create",
    });
  });

  it("should throw when the command declares a global option", () => {
    expect(() =>
      parseLeafValues(
        [],
        { ...CREATE_COMMAND, options: { verbose: { type: "boolean", description: "Verbose" } } },
        ["unirelman", "changesets", "create"],
        GLOBAL_OPTION_DEFS,
      ),
    ).toThrow(new CLIReservedOptionError("unirelman changesets create", "--verbose"));
    expect(mockedParseArgv).not.toHaveBeenCalled();
  });

  it("should throw on an unknown option, listing the options of the command", () => {
    expect(() =>
      parseLeafValues(
        ["changesets", "create", "--levle", "patch"],
        CREATE_COMMAND,
        ["unirelman", "changesets", "create"],
        GLOBAL_OPTION_DEFS,
      ),
    ).toThrow(new CLIUnknownOptionError("--levle", ["--level"]));
  });

  it("should throw on an argument after the leaf command", () => {
    expect(() =>
      parseLeafValues(
        ["changesets", "create", "extra"],
        CREATE_COMMAND,
        ["unirelman", "changesets", "create"],
        GLOBAL_OPTION_DEFS,
      ),
    ).toThrow(new CLIUnexpectedArgumentError("extra"));
  });
});

describe("runCommandLine", () => {
  const resolveCommandTargetSpy = vi.spyOn(thisMod, "resolveCommandTarget");
  const parseLeafValuesSpy = vi.spyOn(thisMod, "parseLeafValues");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse the options of the leaf command, then run it", async () => {
    const renderer = new MockRenderer();
    const rawArgs = ["changesets", "create", "--level", "patch"];
    const tokens = [
      { kind: "positional", value: "changesets" },
      { kind: "positional", value: "create" },
    ] as const;

    parseLeafValuesSpy.mockReturnValueOnce({ level: "patch" });
    mockedRunCommand.mockResolvedValueOnce(undefined);

    await expect(
      runCommandLine(
        MAIN_COMMAND,
        rawArgs,
        createCommandLine({ globalOptionDefs: GLOBAL_OPTION_DEFS, tokens }),
        renderer,
      ),
    ).resolves.toEqual(undefined);

    expect(resolveCommandTargetSpy).toHaveBeenNthCalledWith(
      1,
      MAIN_COMMAND,
      tokens,
      ["unirelman"],
      ["--verbose"],
    );
    expect(parseLeafValuesSpy).toHaveBeenCalledTimes(1);
    expect(parseLeafValuesSpy).toHaveBeenNthCalledWith(
      1,
      rawArgs,
      CREATE_COMMAND,
      ["unirelman", "changesets", "create"],
      GLOBAL_OPTION_DEFS,
    );
    expect(mockedRunCommand).toHaveBeenCalledTimes(1);
    expect(mockedRunCommand).toHaveBeenNthCalledWith(
      1,
      CREATE_COMMAND,
      { level: "patch" },
      renderer,
    );
    expect(renderer.print).not.toHaveBeenCalled();
  });

  it("should print the usage of the requested command", async () => {
    const renderer = new MockRenderer();

    mockedFormatUsage.mockReturnValueOnce("Usage: unirelman changesets <command> [options]");

    await expect(
      runCommandLine(
        MAIN_COMMAND,
        ["changesets", "--help"],
        createCommandLine({
          globalOptionDefs: GLOBAL_OPTION_DEFS,
          options: createGlobalOptions({ help: true }),
          tokens: [{ kind: "positional", value: "changesets" }],
        }),
        renderer,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedFormatUsage).toHaveBeenCalledTimes(1);
    expect(mockedFormatUsage).toHaveBeenNthCalledWith(
      1,
      { command: CHANGESETS_COMMAND, names: ["unirelman", "changesets"] },
      GLOBAL_OPTION_DEFS,
    );
    expect(renderer.print).toHaveBeenCalledTimes(1);
    expect(renderer.print).toHaveBeenNthCalledWith(
      1,
      "Usage: unirelman changesets <command> [options]",
    );
    expect(mockedFailCommand).not.toHaveBeenCalled();
    expect(parseLeafValuesSpy).not.toHaveBeenCalled();
    expect(mockedRunCommand).not.toHaveBeenCalled();
  });

  it("should print the usage and fail when no command is given", async () => {
    const renderer = new MockRenderer();

    mockedFormatUsage.mockReturnValueOnce("Usage: unirelman <command> [options]");

    await expect(
      runCommandLine(
        MAIN_COMMAND,
        [],
        createCommandLine({ globalOptionDefs: GLOBAL_OPTION_DEFS }),
        renderer,
      ),
    ).resolves.toEqual(undefined);

    expect(mockedFormatUsage).toHaveBeenCalledTimes(1);
    expect(mockedFormatUsage).toHaveBeenNthCalledWith(
      1,
      { command: MAIN_COMMAND, names: ["unirelman"] },
      GLOBAL_OPTION_DEFS,
    );
    expect(renderer.printError).toHaveBeenCalledTimes(1);
    expect(renderer.printError).toHaveBeenNthCalledWith(1, "Usage: unirelman <command> [options]");
    expect(renderer.print).not.toHaveBeenCalled();
    expect(mockedFailCommand).toHaveBeenCalledTimes(1);
    expect(parseLeafValuesSpy).not.toHaveBeenCalled();
    expect(mockedRunCommand).not.toHaveBeenCalled();
  });
});
