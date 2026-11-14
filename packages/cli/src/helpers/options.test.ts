import { mockedFormatOptionFlags } from "./flags.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIDuplicateOptionError,
  CLIInvalidOptionAliasError,
  CLIInvalidOptionTypeError,
  CLIReservedOptionError,
} from "../errors";
import * as thisMod from "./options";
import {
  assertCommandOptions,
  findInvalidOptionKeys,
  isParsedOptions,
  resolveCommandOptions,
} from "./options";

const ARGS = {
  config: { type: "string", alias: "C", description: "Config" },
  dryRun: { type: "boolean", description: "Dry run" },
} as const;

describe("assertCommandOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should accept options that differ from the global options and from each other", () => {
    expect(
      assertCommandOptions(
        "unirelman pre",
        { channel: { type: "string", alias: "c", description: "Channel" } },
        ARGS,
      ),
    ).toEqual(undefined);
    expect(mockedFormatOptionFlags).toHaveBeenCalledTimes(3);
    expect(mockedFormatOptionFlags).toHaveBeenNthCalledWith(1, "config", ARGS.config);
    expect(mockedFormatOptionFlags).toHaveBeenNthCalledWith(2, "dryRun", ARGS.dryRun);
    expect(mockedFormatOptionFlags).toHaveBeenNthCalledWith(3, "channel", {
      type: "string",
      alias: "c",
      description: "Channel",
    });
  });

  it("should throw when an alias is longer than one character", () => {
    expect(() =>
      assertCommandOptions(
        "unirelman pre",
        { channel: { type: "string", alias: "ch", description: "Channel" } },
        ARGS,
      ),
    ).toThrow(new CLIInvalidOptionAliasError("unirelman pre", "ch"));
  });

  it("should throw when an option uses a global option name", () => {
    expect(() =>
      assertCommandOptions(
        "unirelman pre",
        { dryRun: { type: "string", description: "Dry run" } },
        ARGS,
      ),
    ).toThrow(new CLIReservedOptionError("unirelman pre", "--dry-run"));
  });

  it("should throw when an option uses a global alias", () => {
    expect(() =>
      assertCommandOptions(
        "unirelman pre",
        { channel: { type: "string", alias: "C", description: "Channel" } },
        ARGS,
      ),
    ).toThrow(new CLIReservedOptionError("unirelman pre", "-C"));
  });

  it("should throw when two options share a flag", () => {
    expect(() =>
      assertCommandOptions(
        "unirelman pre",
        {
          exitNow: { type: "boolean", description: "Exit" },
          "exit-now": { type: "boolean", description: "Exit" },
        },
        ARGS,
      ),
    ).toThrow(new CLIDuplicateOptionError("unirelman pre", "--exit-now"));
  });
});

describe("findInvalidOptionKeys", () => {
  it("should return the keys whose value has another type", () => {
    expect(findInvalidOptionKeys({ config: true, dryRun: true }, ARGS)).toEqual(["config"]);
  });

  it("should accept missing values", () => {
    expect(findInvalidOptionKeys({}, ARGS)).toEqual([]);
  });
});

describe("isParsedOptions", () => {
  const findInvalidOptionKeysSpy = vi.spyOn(thisMod, "findInvalidOptionKeys");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when every value matches its arg", () => {
    expect(isParsedOptions({ config: "a.ts" }, ARGS)).toEqual(true);
    expect(findInvalidOptionKeysSpy).toHaveBeenCalledTimes(1);
    expect(findInvalidOptionKeysSpy).toHaveBeenNthCalledWith(1, { config: "a.ts" }, ARGS);
  });

  it("should return false when a value has another type", () => {
    expect(isParsedOptions({ dryRun: "yes" }, ARGS)).toEqual(false);
  });
});

describe("resolveCommandOptions", () => {
  const isParsedOptionsSpy = vi.spyOn(thisMod, "isParsedOptions");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep only the values of the given args", () => {
    expect(resolveCommandOptions(ARGS, { config: "a.ts", verbose: true })).toEqual({
      config: "a.ts",
      dryRun: undefined,
    });
    expect(isParsedOptionsSpy).toHaveBeenCalledTimes(1);
    expect(isParsedOptionsSpy).toHaveBeenNthCalledWith(
      1,
      { config: "a.ts", dryRun: undefined },
      ARGS,
    );
  });

  it("should throw with every value of another type than its arg", () => {
    expect(() => resolveCommandOptions(ARGS, { config: true, dryRun: "yes" })).toThrow(
      new CLIInvalidOptionTypeError(["--config", "--dry-run"]),
    );
  });
});
