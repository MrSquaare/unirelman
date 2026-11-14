import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./flags";
import {
  formatAliasFlag,
  formatLongFlag,
  formatLongFlags,
  formatOptionFlags,
  resolveOptionName,
} from "./flags";

const ARGS = {
  config: { type: "string", alias: "C", description: "Config" },
  dryRun: { type: "boolean", description: "Dry run" },
} as const;

describe("resolveOptionName", () => {
  it("should convert a camel case key to a kebab case option name", () => {
    expect(resolveOptionName("dryRun")).toEqual("dry-run");
  });

  it("should keep a single word key", () => {
    expect(resolveOptionName("config")).toEqual("config");
  });
});

describe("formatLongFlag", () => {
  const resolveOptionNameSpy = vi.spyOn(thisMod, "resolveOptionName");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format the long flag of a key", () => {
    expect(formatLongFlag("dryRun")).toEqual("--dry-run");
    expect(resolveOptionNameSpy).toHaveBeenCalledTimes(1);
    expect(resolveOptionNameSpy).toHaveBeenNthCalledWith(1, "dryRun");
  });
});

describe("formatAliasFlag", () => {
  it("should format the short flag of an alias", () => {
    expect(formatAliasFlag("C")).toEqual("-C");
  });
});

describe("formatLongFlags", () => {
  const formatLongFlagSpy = vi.spyOn(thisMod, "formatLongFlag");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format the long flag of every arg", () => {
    expect(formatLongFlags(ARGS)).toEqual(["--config", "--dry-run"]);
    expect(formatLongFlagSpy).toHaveBeenCalledTimes(2);
    expect(formatLongFlagSpy).toHaveBeenNthCalledWith(1, "config");
    expect(formatLongFlagSpy).toHaveBeenNthCalledWith(2, "dryRun");
  });
});

describe("formatOptionFlags", () => {
  const formatAliasFlagSpy = vi.spyOn(thisMod, "formatAliasFlag");
  const formatLongFlagSpy = vi.spyOn(thisMod, "formatLongFlag");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format the alias flag, then the long flag", () => {
    expect(formatOptionFlags("config", ARGS.config)).toEqual(["-C", "--config"]);
    expect(formatAliasFlagSpy).toHaveBeenCalledTimes(1);
    expect(formatAliasFlagSpy).toHaveBeenNthCalledWith(1, "C");
    expect(formatLongFlagSpy).toHaveBeenCalledTimes(1);
    expect(formatLongFlagSpy).toHaveBeenNthCalledWith(1, "config");
  });

  it("should format only the long flag of an arg without alias", () => {
    expect(formatOptionFlags("dryRun", ARGS.dryRun)).toEqual(["--dry-run"]);
    expect(formatAliasFlagSpy).not.toHaveBeenCalled();
  });
});
