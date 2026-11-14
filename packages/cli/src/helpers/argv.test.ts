import { mockedResolveOptionName } from "./flags.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CLIMissingOptionValueError, CLIUnexpectedOptionValueError } from "../errors";
import * as thisMod from "./argv";
import {
  parseArgv,
  resolveOptionValue,
  resolveParseOptions,
  resolveShortOptionGroup,
} from "./argv";

const ARGS = {
  config: { type: "string", alias: "C", description: "Config" },
  dryRun: { type: "boolean", description: "Dry run" },
} as const;

describe("resolveParseOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should declare each option with its type and short alias", () => {
    expect(resolveParseOptions(ARGS)).toEqual({
      config: { type: "string", short: "C" },
      "dry-run": { type: "boolean" },
    });
    expect(mockedResolveOptionName).toHaveBeenCalledTimes(2);
    expect(mockedResolveOptionName).toHaveBeenNthCalledWith(1, "config");
    expect(mockedResolveOptionName).toHaveBeenNthCalledWith(2, "dryRun");
  });
});

describe("resolveOptionValue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for a boolean option", () => {
    expect(resolveOptionValue(ARGS.dryRun, { rawName: "--dry-run" })).toEqual(true);
  });

  it("should return the value of a string option", () => {
    expect(
      resolveOptionValue(ARGS.config, { rawName: "--config", value: "a.ts", inlineValue: false }),
    ).toEqual("a.ts");
  });

  it("should accept an inline value starting with a dash", () => {
    expect(
      resolveOptionValue(ARGS.config, { rawName: "--config", value: "-a.ts", inlineValue: true }),
    ).toEqual("-a.ts");
  });

  it("should throw when a boolean option has a value", () => {
    expect(() =>
      resolveOptionValue(ARGS.dryRun, { rawName: "--dry-run", value: "yes", inlineValue: true }),
    ).toThrow(new CLIUnexpectedOptionValueError("--dry-run"));
  });

  it("should throw when a string option has no value", () => {
    expect(() => resolveOptionValue(ARGS.config, { rawName: "--config" })).toThrow(
      new CLIMissingOptionValueError("--config"),
    );
  });

  it("should throw when a string option is followed by another option", () => {
    expect(() =>
      resolveOptionValue(ARGS.config, { rawName: "-C", value: "--verbose", inlineValue: false }),
    ).toThrow(new CLIMissingOptionValueError("-C"));
  });
});

describe("resolveShortOptionGroup", () => {
  const typesByAlias = new Map([
    ["v", "boolean"],
    ["C", "string"],
  ] as const);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep a group of known boolean aliases", () => {
    expect(resolveShortOptionGroup("-vv", typesByAlias)).toEqual("-vv");
  });

  it("should cut a group after its first unknown alias", () => {
    expect(resolveShortOptionGroup("-vmC", typesByAlias)).toEqual("-vm");
  });

  it("should keep the rest of a group after a string alias as its value", () => {
    expect(resolveShortOptionGroup("-vCmfoo", typesByAlias)).toEqual("-vCmfoo");
  });

  it("should return a long option unchanged", () => {
    expect(resolveShortOptionGroup("--mC", typesByAlias)).toEqual("--mC");
  });

  it("should return a positional unchanged", () => {
    expect(resolveShortOptionGroup("create", typesByAlias)).toEqual("create");
  });
});

describe("parseArgv", () => {
  const resolveShortOptionGroupSpy = vi.spyOn(thisMod, "resolveShortOptionGroup");
  const resolveParseOptionsSpy = vi.spyOn(thisMod, "resolveParseOptions");
  const resolveOptionValueSpy = vi.spyOn(thisMod, "resolveOptionValue");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the values of the declared options and the other tokens in order", () => {
    expect(parseArgv(["-C", "a.ts", "changesets", "--level", "create", "--dry-run"], ARGS)).toEqual(
      {
        values: { config: "a.ts", dryRun: true },
        tokens: [
          { kind: "positional", value: "changesets" },
          { kind: "unknownOption", rawName: "--level" },
          { kind: "positional", value: "create" },
        ],
      },
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenCalledTimes(6);
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(1, "-C", new Map([["C", "string"]]));
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      2,
      "a.ts",
      new Map([["C", "string"]]),
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      3,
      "changesets",
      new Map([["C", "string"]]),
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      4,
      "--level",
      new Map([["C", "string"]]),
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      5,
      "create",
      new Map([["C", "string"]]),
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      6,
      "--dry-run",
      new Map([["C", "string"]]),
    );
    expect(resolveParseOptionsSpy).toHaveBeenCalledTimes(1);
    expect(resolveParseOptionsSpy).toHaveBeenNthCalledWith(1, ARGS);
    expect(resolveOptionValueSpy).toHaveBeenCalledTimes(2);
    expect(resolveOptionValueSpy).toHaveBeenNthCalledWith(1, ARGS.config, {
      rawName: "-C",
      value: "a.ts",
      inlineValue: false,
    });
    expect(resolveOptionValueSpy).toHaveBeenNthCalledWith(2, ARGS.dryRun, {
      rawName: "--dry-run",
      value: undefined,
      inlineValue: undefined,
    });
  });

  it("should skip the rest of a short option group after an unknown option", () => {
    const optionDefs = {
      verbose: { type: "boolean", alias: "v", description: "Verbose" },
    } as const;

    expect(parseArgv(["create", "-vmhello"], optionDefs)).toEqual({
      values: { verbose: true },
      tokens: [
        { kind: "positional", value: "create" },
        { kind: "unknownOption", rawName: "-m" },
      ],
    });
  });

  it("should read the rest of a short option group as the value of a string option", () => {
    const optionDefs = {
      verbose: { type: "boolean", alias: "v", description: "Verbose" },
      message: { type: "string", alias: "m", description: "Message" },
    } as const;

    expect(parseArgv(["create", "-vmhello"], optionDefs)).toEqual({
      values: { verbose: true, message: "hello" },
      tokens: [{ kind: "positional", value: "create" }],
    });
  });

  it("should keep the argument after a cut short option group", () => {
    expect(parseArgv(["create", "-mC", "--dry-run"], ARGS)).toEqual({
      values: { dryRun: true },
      tokens: [
        { kind: "positional", value: "create" },
        { kind: "unknownOption", rawName: "-m" },
      ],
    });
  });

  it("should keep arguments after the option terminator as positionals", () => {
    expect(parseArgv(["version", "--", "--dry-run", "-mC"], ARGS)).toEqual({
      values: {},
      tokens: [
        { kind: "positional", value: "version" },
        { kind: "positional", value: "--dry-run" },
        { kind: "positional", value: "-mC" },
      ],
    });
    expect(resolveShortOptionGroupSpy).toHaveBeenCalledTimes(2);
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(
      1,
      "version",
      new Map([["C", "string"]]),
    );
    expect(resolveShortOptionGroupSpy).toHaveBeenNthCalledWith(2, "--", new Map([["C", "string"]]));
  });
});
