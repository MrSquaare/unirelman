import { mockedResolveCommandOptions } from "./helpers/options.mock";

import type { ScopedConfigPlugin } from "@unirelman/core";

import { createConfig } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { defineCommand, defineCommandGroup, defineConfig } from "./define";
import { MockCommandUI } from "./testing/mocks/ui";

describe("defineConfig", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the passed config object unmodified", () => {
    const config = createConfig();

    expect(defineConfig(config)).toEqual(config);
  });

  it("should restrict scoped config plugin scopes to declared scope names", () => {
    expectTypeOf(defineConfig<"alpha" | "beta">)
      .parameter(0)
      .toHaveProperty("plugins")
      .items.exclude<{ name: string }>()
      .toEqualTypeOf<ScopedConfigPlugin<"alpha" | "beta">>();
  });
});

describe("defineCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should define a leaf command with the definition meta, args, title and failure", () => {
    const command = defineCommand({
      meta: { name: "pre", description: "Put a scope in prerelease mode" },
      title: "Configure prerelease",
      options: { scope: { type: "string", description: "Scope" } },
      failure: "Prerelease failed",
      run: vi.fn(),
      success: vi.fn(),
    });

    expect(command.meta).toEqual({ name: "pre", description: "Put a scope in prerelease mode" });
    expect(command.options).toEqual({ scope: { type: "string", description: "Scope" } });
    expect(command.title).toEqual("Configure prerelease");
    expect(command.failure).toEqual("Prerelease failed");
  });

  it("should run the definition with parsed args and return its result and success message", async () => {
    const ui = new MockCommandUI();
    const run = vi.fn().mockResolvedValueOnce({ scope: "root" });
    const success = vi
      .fn()
      .mockReturnValueOnce({ summary: [], message: "Configured prerelease for root" });
    const command = defineCommand({
      meta: { name: "pre" },
      title: "Configure prerelease",
      options: { scope: { type: "string", description: "Scope" } },
      run,
      success,
    });

    await expect(command.run({ values: { scope: "root", verbose: true }, ui })).resolves.toEqual({
      result: { scope: "root" },
      success: { summary: [], message: "Configured prerelease for root" },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(mockedResolveCommandOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveCommandOptions).toHaveBeenNthCalledWith(
      1,
      { scope: { type: "string", description: "Scope" } },
      { scope: "root", verbose: true },
    );
    expect(run).toHaveBeenNthCalledWith(1, { options: { scope: "root" }, ui });
    expect(success).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenNthCalledWith(1, { scope: "root" });
  });

  it("should define no failure message when the definition has none", () => {
    const command = defineCommand({
      meta: { name: "pre" },
      title: "Configure prerelease",
      options: {},
      run: vi.fn(),
      success: vi.fn(),
    });

    expect(command.failure).toEqual(undefined);
  });
});

describe("defineCommandGroup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the passed command group unmodified", () => {
    const group = { meta: { name: "changesets" }, subCommands: {} };

    expect(defineCommandGroup(group)).toEqual(group);
  });
});
