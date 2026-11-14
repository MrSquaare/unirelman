import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommandGroup, LeafCommand } from "../types/command";

import * as thisMod from "./usage";
import {
  formatOptionLabel,
  formatOptionRows,
  formatUsage,
  formatUsageRows,
  formatUsageSection,
} from "./usage";

const GLOBAL_OPTION_DEFS = {
  verbose: { type: "boolean", alias: "v", description: "Show every log message" },
} as const;

const CREATE_COMMAND: LeafCommand = {
  meta: { name: "create", description: "Create a changeset" },
  title: "Create changeset",
  options: {
    scopes: { type: "string", description: "Scopes", valueHint: "scopes" },
    dryRun: { type: "boolean", description: "Dry run" },
  },
  run: vi.fn(),
};

const CHANGESETS_COMMAND: CommandGroup = {
  meta: { name: "changesets", description: "Manage changesets" },
  subCommands: { create: CREATE_COMMAND },
};

describe("formatOptionLabel", () => {
  it("should label a boolean option with its alias", () => {
    expect(formatOptionLabel("verbose", GLOBAL_OPTION_DEFS.verbose)).toEqual("-v, --verbose");
  });

  it("should label a string option with its value hint", () => {
    expect(
      formatOptionLabel("scopes", { type: "string", description: "Scopes", valueHint: "list" }),
    ).toEqual("--scopes <list>");
  });

  it("should label a string option with its name when it has no value hint", () => {
    expect(formatOptionLabel("configPath", { type: "string", description: "Config" })).toEqual(
      "--config-path <config-path>",
    );
  });
});

describe("formatUsageRows", () => {
  it("should align the descriptions of the rows", () => {
    expect(
      formatUsageRows([
        ["create", "Create a changeset"],
        ["pre", "Put scopes in prerelease mode"],
      ]),
    ).toEqual("  create  Create a changeset\n  pre     Put scopes in prerelease mode");
  });

  it("should trim a row without description", () => {
    expect(formatUsageRows([["run", ""]])).toEqual("  run");
  });
});

describe("formatUsageSection", () => {
  const formatUsageRowsSpy = vi.spyOn(thisMod, "formatUsageRows");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should list the rows under the title", () => {
    expect(formatUsageSection("Commands", [["create", "Create a changeset"]])).toEqual([
      "Commands:\n  create  Create a changeset",
    ]);
    expect(formatUsageRowsSpy).toHaveBeenCalledTimes(1);
    expect(formatUsageRowsSpy).toHaveBeenNthCalledWith(1, [["create", "Create a changeset"]]);
  });

  it("should return no section without rows", () => {
    expect(formatUsageSection("Commands", [])).toEqual([]);
    expect(formatUsageRowsSpy).not.toHaveBeenCalled();
  });
});

describe("formatOptionRows", () => {
  const formatOptionLabelSpy = vi.spyOn(thisMod, "formatOptionLabel");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should give each option its label and description", () => {
    expect(formatOptionRows(GLOBAL_OPTION_DEFS)).toEqual([
      ["-v, --verbose", "Show every log message"],
    ]);
    expect(formatOptionLabelSpy).toHaveBeenCalledTimes(1);
    expect(formatOptionLabelSpy).toHaveBeenNthCalledWith(1, "verbose", GLOBAL_OPTION_DEFS.verbose);
  });
});

describe("formatUsage", () => {
  const formatUsageSectionSpy = vi.spyOn(thisMod, "formatUsageSection");
  const formatOptionRowsSpy = vi.spyOn(thisMod, "formatOptionRows");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the usage of a command group with its commands", () => {
    expect(
      formatUsage(
        { command: CHANGESETS_COMMAND, names: ["unirelman", "changesets"] },
        GLOBAL_OPTION_DEFS,
      ),
    ).toEqual(
      [
        "Manage changesets",
        "Usage: unirelman changesets <command> [options]",
        "Commands:\n  create  Create a changeset",
        "Global options:\n  -v, --verbose  Show every log message",
      ].join("\n\n"),
    );
    expect(formatUsageSectionSpy).toHaveBeenCalledTimes(2);
    expect(formatUsageSectionSpy).toHaveBeenNthCalledWith(1, "Commands", [
      ["create", "Create a changeset"],
    ]);
    expect(formatUsageSectionSpy).toHaveBeenNthCalledWith(2, "Global options", [
      ["-v, --verbose", "Show every log message"],
    ]);
    expect(formatOptionRowsSpy).toHaveBeenCalledTimes(1);
    expect(formatOptionRowsSpy).toHaveBeenNthCalledWith(1, GLOBAL_OPTION_DEFS);
  });

  it("should render the usage of a leaf command with its options", () => {
    expect(
      formatUsage(
        { command: CREATE_COMMAND, names: ["unirelman", "changesets", "create"] },
        GLOBAL_OPTION_DEFS,
      ),
    ).toEqual(
      [
        "Create a changeset",
        "Usage: unirelman changesets create [options]",
        "Options:\n  --scopes <scopes>  Scopes\n  --dry-run          Dry run",
        "Global options:\n  -v, --verbose  Show every log message",
      ].join("\n\n"),
    );
    expect(formatOptionRowsSpy).toHaveBeenCalledTimes(2);
    expect(formatOptionRowsSpy).toHaveBeenNthCalledWith(1, CREATE_COMMAND.options);
    expect(formatOptionRowsSpy).toHaveBeenNthCalledWith(2, GLOBAL_OPTION_DEFS);
  });

  it("should render a command group whose commands have no description", () => {
    expect(
      formatUsage(
        {
          command: {
            meta: { name: "main" },
            subCommands: { run: { ...CREATE_COMMAND, meta: { name: "run" } } },
          },
          names: ["main"],
        },
        {},
      ),
    ).toEqual(["Usage: main <command> [options]", "Commands:\n  run"].join("\n\n"));
  });

  it("should render a command group without commands", () => {
    expect(
      formatUsage({ command: { meta: { name: "main" }, subCommands: {} }, names: ["main"] }, {}),
    ).toEqual("Usage: main <command> [options]");
  });

  it("should render a leaf command without description", () => {
    expect(
      formatUsage(
        { command: { ...CREATE_COMMAND, meta: { name: "run" }, options: {} }, names: ["run"] },
        {},
      ),
    ).toEqual("Usage: run [options]");
  });
});
