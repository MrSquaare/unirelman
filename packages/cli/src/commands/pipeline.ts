import { Pipeline, PIPELINE_NAMES, type PipelineName, type ResolvedConfig } from "@unirelman/core";

import type { Command, LeafCommand } from "../types/command";
import type { Renderer } from "../types/renderer";

import { defineCommand } from "../define";
import { resolvePipelineOutput } from "../helpers/pipeline-output";
import { resolvePipelineSummary } from "../helpers/pipeline-summary";
import * as thisMod from "./pipeline";

const PIPELINE_COMMAND_MESSAGES = {
  version: {
    title: "Version",
    description: "Compute and apply the next versions",
    progress: "Versioning",
    success: "🎉 Versioning completed successfully!",
    failure: "❌ An error occurred during versioning.",
  },
  publish: {
    title: "Publish",
    description: "Publish the current versions",
    progress: "Publishing",
    success: "🎉 Publishing completed successfully!",
    failure: "❌ An error occurred during publishing.",
  },
} as const satisfies Record<
  PipelineName,
  {
    readonly title: string;
    readonly description: string;
    readonly progress: string;
    readonly success: string;
    readonly failure: string;
  }
>;

export const createPipelineCommand = (
  pipelineName: PipelineName,
  cwd: string,
  config: ResolvedConfig,
  renderer: Renderer,
): LeafCommand => {
  const messages = PIPELINE_COMMAND_MESSAGES[pipelineName];

  return defineCommand({
    meta: {
      name: pipelineName,
      description: messages.description,
    },
    title: messages.title,
    options: {
      dryRun: {
        type: "boolean",
        description: "Perform a dry run without making any changes",
      },
    },
    run: async ({ options, ui }) => {
      const pipeline = new Pipeline({
        cwd,
        config,
        createLogger: renderer.createLogger,
      });

      ui.progress.start(messages.progress);

      const result = await pipeline.run(pipelineName, {
        dryRun: options.dryRun,
      });

      return resolvePipelineOutput(cwd, result);
    },
    success: (output) => ({ summary: resolvePipelineSummary(output), message: messages.success }),
    failure: messages.failure,
  });
};

export const createPipelineCommands = (
  cwd: string,
  config: ResolvedConfig,
  renderer: Renderer,
): Record<string, Command> => {
  return Object.fromEntries(
    PIPELINE_NAMES.map((pipelineName) => [
      pipelineName,
      thisMod.createPipelineCommand(pipelineName, cwd, config, renderer),
    ]),
  );
};
