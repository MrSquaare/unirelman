import type { Plugin } from "@unirelman/core";

import { createPlugin } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommandGroup, LeafCommand } from "../types/command";

import { createCLIPlugin } from "../testing/fixtures/plugin";
import { isCLIPlugin, isCommandGroup, isPositionalToken, isUnknownOptionToken } from "./guard";

describe("isCLIPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for cli plugin", () => {
    expect(isCLIPlugin(createCLIPlugin())).toEqual(true);
  });

  it("should return false for non-cli plugin", () => {
    const plugin: Plugin = createPlugin();

    expect(isCLIPlugin(plugin)).toEqual(false);
  });
});

describe("isCommandGroup", () => {
  it("should return true for a command group", () => {
    const group: CommandGroup = { meta: { name: "group" }, subCommands: {} };

    expect(isCommandGroup(group)).toEqual(true);
  });

  it("should return false for a leaf command", () => {
    const command: LeafCommand = {
      meta: { name: "leaf" },
      title: "Leaf",
      options: {},
      run: vi.fn(),
    };

    expect(isCommandGroup(command)).toEqual(false);
  });
});

describe("isUnknownOptionToken", () => {
  it("should return true for an unknown option token", () => {
    expect(isUnknownOptionToken({ kind: "unknownOption", rawName: "--levle" })).toEqual(true);
  });

  it("should return false for a positional token", () => {
    expect(isUnknownOptionToken({ kind: "positional", value: "version" })).toEqual(false);
  });
});

describe("isPositionalToken", () => {
  it("should return true for a positional token", () => {
    expect(isPositionalToken({ kind: "positional", value: "version" })).toEqual(true);
  });

  it("should return false for an unknown option token", () => {
    expect(isPositionalToken({ kind: "unknownOption", rawName: "--levle" })).toEqual(false);
  });
});
