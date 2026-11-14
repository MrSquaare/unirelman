import { mockedResolvePipelineOutput } from "../helpers/pipeline-output.mock";
import { mockedResolvePipelineSummary } from "../helpers/pipeline-summary.mock";

import {
  CONFIG_CWD,
  createPrepareState,
  createResolvedConfig,
} from "@unirelman/core/testing/fixtures";
import { MockedPipeline } from "@unirelman/core/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LeafCommand } from "../types/command";

import { MockRenderer } from "../testing/mocks/renderer";
import { MockCommandUI } from "../testing/mocks/ui";
import { createPipelineCommand, createPipelineCommands } from "./pipeline";
import * as thisMod from "./pipeline";

describe("createPipelineCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should define the version command with its messages", () => {
    const command = createPipelineCommand(
      "version",
      CONFIG_CWD,
      createResolvedConfig(),
      new MockRenderer(),
    );

    expect(command.meta).toEqual({
      name: "version",
      description: "Compute and apply the next versions",
    });
    expect(command.options).toEqual({
      dryRun: { type: "boolean", description: "Perform a dry run without making any changes" },
    });
    expect(command.title).toEqual("Version");
    expect(command.failure).toEqual("❌ An error occurred during versioning.");
  });

  it("should define the publish command with its messages", () => {
    const command = createPipelineCommand(
      "publish",
      CONFIG_CWD,
      createResolvedConfig(),
      new MockRenderer(),
    );

    expect(command.meta).toEqual({ name: "publish", description: "Publish the current versions" });
    expect(command.title).toEqual("Publish");
    expect(command.failure).toEqual("❌ An error occurred during publishing.");
  });

  it("should run the pipeline with progress, then return its output and summary", async () => {
    const config = createResolvedConfig();
    const renderer = new MockRenderer();
    const ui = new MockCommandUI();
    const command = createPipelineCommand("version", CONFIG_CWD, config, renderer);
    const result = { pipeline: "version" as const, dryRun: false, ...createPrepareState() };
    const output = { pipeline: "version" as const, dryRun: false, scopes: {}, files: [] };

    MockedPipeline.mockImplementationOnce(function () {
      this.run = vi.fn().mockResolvedValueOnce(result);
    });
    mockedResolvePipelineOutput.mockReturnValueOnce(output);
    mockedResolvePipelineSummary.mockReturnValueOnce(["@scope/a: 1.0.0 → 1.0.1"]);

    await expect(command.run({ values: {}, ui })).resolves.toEqual({
      result: output,
      success: {
        summary: ["@scope/a: 1.0.0 → 1.0.1"],
        message: "🎉 Versioning completed successfully!",
      },
    });

    const pipeline = vi.mocked(MockedPipeline.mock.instances[0]);

    expect(MockedPipeline).toHaveBeenCalledTimes(1);
    expect(MockedPipeline).toHaveBeenNthCalledWith(1, {
      cwd: CONFIG_CWD,
      config,
      createLogger: renderer.createLogger,
    });
    expect(ui.progress.start).toHaveBeenCalledTimes(1);
    expect(ui.progress.start).toHaveBeenNthCalledWith(1, "Versioning");
    expect(pipeline.run).toHaveBeenCalledTimes(1);
    expect(pipeline.run).toHaveBeenNthCalledWith(1, "version", { dryRun: undefined });
    expect(mockedResolvePipelineOutput).toHaveBeenCalledTimes(1);
    expect(mockedResolvePipelineOutput).toHaveBeenNthCalledWith(1, CONFIG_CWD, result);
    expect(mockedResolvePipelineSummary).toHaveBeenCalledTimes(1);
    expect(mockedResolvePipelineSummary).toHaveBeenNthCalledWith(1, output);
  });

  it("should run the pipeline in dry-run when dry-run argument is provided", async () => {
    const ui = new MockCommandUI();
    const command = createPipelineCommand(
      "publish",
      CONFIG_CWD,
      createResolvedConfig(),
      new MockRenderer(),
    );

    mockedResolvePipelineSummary.mockReturnValueOnce(["Dry run: nothing was changed."]);

    await command.run({ values: { dryRun: true }, ui });

    const pipeline = vi.mocked(MockedPipeline.mock.instances[0]);

    expect(ui.progress.start).toHaveBeenCalledTimes(1);
    expect(ui.progress.start).toHaveBeenNthCalledWith(1, "Publishing");
    expect(pipeline.run).toHaveBeenCalledTimes(1);
    expect(pipeline.run).toHaveBeenNthCalledWith(1, "publish", { dryRun: true });
  });
});

describe("createPipelineCommands", () => {
  const createPipelineCommandSpy = vi.spyOn(thisMod, "createPipelineCommand");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create one command per pipeline", () => {
    const config = createResolvedConfig();
    const renderer = new MockRenderer();
    const versionCommand: LeafCommand = {
      meta: { name: "version" },
      title: "Version",
      options: {},
      run: vi.fn(),
    };
    const publishCommand: LeafCommand = {
      meta: { name: "publish" },
      title: "Publish",
      options: {},
      run: vi.fn(),
    };

    createPipelineCommandSpy
      .mockReturnValueOnce(versionCommand)
      .mockReturnValueOnce(publishCommand);

    expect(createPipelineCommands(CONFIG_CWD, config, renderer)).toEqual({
      version: versionCommand,
      publish: publishCommand,
    });
    expect(createPipelineCommandSpy).toHaveBeenCalledTimes(2);
    expect(createPipelineCommandSpy).toHaveBeenNthCalledWith(
      1,
      "version",
      CONFIG_CWD,
      config,
      renderer,
    );
    expect(createPipelineCommandSpy).toHaveBeenNthCalledWith(
      2,
      "publish",
      CONFIG_CWD,
      config,
      renderer,
    );
  });
});
