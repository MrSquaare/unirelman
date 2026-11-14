import { mockedParseArgv } from "./argv.mock";
import { mockedResolveCommandOptions } from "./options.mock";

import { CONFIG_CWD } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OptionsDef } from "../types/option";

import { CLIConflictingOutputModesError } from "../errors";
import { parseCommandLine } from "./command-line";
import { createGlobalOptions } from "./command-line.fixture";

const expectedOptionDefs = {
  config: {
    type: "string",
    alias: "C",
    description: "Path to the configuration file",
    valueHint: "path",
  },
  verbose: {
    type: "boolean",
    alias: "v",
    description: "Show every log message, and the stack traces of errors",
  },
  interactive: {
    type: "boolean",
    description:
      "Show progress and prompt for missing options (default in an interactive terminal)",
  },
  plain: {
    type: "boolean",
    description: "Print plain lines and never prompt (default outside an interactive terminal)",
  },
  json: {
    type: "boolean",
    description: "Print the result of the command as JSON on standard output, and never prompt",
  },
  help: {
    type: "boolean",
    alias: "h",
    description: "Print the usage of the command",
  },
  version: {
    type: "boolean",
    description: "Print the version of the CLI",
  },
} satisfies OptionsDef;

describe("parseCommandLine", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return default options and the command positionals", () => {
    expect(parseCommandLine(["changesets", "create", "--level", "patch"])).toEqual({
      globalOptionDefs: expectedOptionDefs,
      options: createGlobalOptions(),
      tokens: [
        { kind: "positional", value: "changesets" },
        { kind: "positional", value: "create" },
        { kind: "unknownOption", rawName: "--level" },
        { kind: "positional", value: "patch" },
      ],
    });
    expect(mockedParseArgv).toHaveBeenCalledTimes(1);
    expect(mockedParseArgv).toHaveBeenNthCalledWith(
      1,
      ["changesets", "create", "--level", "patch"],
      expectedOptionDefs,
    );
    expect(mockedResolveCommandOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveCommandOptions).toHaveBeenNthCalledWith(1, expectedOptionDefs, {});
  });

  it("should return provided options when every global option is provided", () => {
    expect(
      parseCommandLine([
        "--config",
        `${CONFIG_CWD}/unirelman.config.ts`,
        "--verbose",
        "--json",
        "--help",
        "--version",
        "version",
      ]),
    ).toEqual({
      globalOptionDefs: expectedOptionDefs,
      options: {
        config: `${CONFIG_CWD}/unirelman.config.ts`,
        verbose: true,
        outputMode: "json",
        help: true,
        version: true,
      },
      tokens: [{ kind: "positional", value: "version" }],
    });
  });

  it("should return provided options when short aliases are provided", () => {
    expect(
      parseCommandLine(["-C", `${CONFIG_CWD}/custom.config.ts`, "-v", "-h", "version"]),
    ).toEqual({
      globalOptionDefs: expectedOptionDefs,
      options: {
        ...createGlobalOptions(),
        config: `${CONFIG_CWD}/custom.config.ts`,
        verbose: true,
        help: true,
      },
      tokens: [{ kind: "positional", value: "version" }],
    });
  });

  it("should return interactive output mode when interactive option is provided", () => {
    expect(parseCommandLine(["--interactive", "version"])).toEqual({
      globalOptionDefs: expectedOptionDefs,
      options: createGlobalOptions({ outputMode: "interactive" }),
      tokens: [{ kind: "positional", value: "version" }],
    });
  });

  it("should return plain output mode when plain option is provided after the command", () => {
    expect(parseCommandLine(["version", "--plain"])).toEqual({
      globalOptionDefs: expectedOptionDefs,
      options: createGlobalOptions({ outputMode: "plain" }),
      tokens: [{ kind: "positional", value: "version" }],
    });
  });

  it("should throw when several output mode options are provided", () => {
    expect(() => parseCommandLine(["--interactive", "--plain", "--json", "version"])).toThrow(
      new CLIConflictingOutputModesError(["--interactive", "--plain", "--json"]),
    );
  });
});
