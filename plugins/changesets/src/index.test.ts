import "./commands/create.mock";
import "./phases/generate-file-operations.mock";
import "./phases/get-changes.mock";
import { mockedCreateCreateCommand } from "./commands/create.mock";
import { mockedRunGenerateFileOperationsPhase } from "./phases/generate-file-operations.mock";
import { mockedRunGetChangesPhase } from "./phases/get-changes.mock";

import type { LeafCommand } from "@unirelman/cli";

import { createPluginContext } from "@unirelman/core/testing/fixtures";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createChangesetsPlugin } from "./index";

describe("createChangesetsPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create expected plugin shape", () => {
    const plugin = createChangesetsPlugin();

    expect(plugin).toEqual({
      name: "changesets",
      commandDescription: "Manage changesets",
      commands: plugin.commands,
      getChanges: mockedRunGetChangesPhase,
      generateFileOperations: mockedRunGenerateFileOperationsPhase,
    });
  });

  it("should create create command from the plugin context", () => {
    const plugin = createChangesetsPlugin();
    const context = createPluginContext();
    const createCommand: LeafCommand = {
      meta: { name: "create", description: "Create" },
      title: "Create changeset",
      options: {},
      run: vi.fn(),
    };

    mockedCreateCreateCommand.mockReturnValueOnce(createCommand);

    expect(plugin.commands(context)).toEqual({
      create: createCommand,
    });
    expect(mockedCreateCreateCommand).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateCommand).toHaveBeenNthCalledWith(1, context, Date.now, randomUUID);
  });
});
