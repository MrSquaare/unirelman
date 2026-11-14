import type { LeafCommand } from "../types/command";
import type { OptionValues } from "../types/option";
import type { Renderer } from "../types/renderer";

import { CLIPromptCancelledError } from "../errors";
import * as thisMod from "./execution";

const DEFAULT_FAILURE_MESSAGE = "❌ The command failed.";
const FAILURE_EXIT_CODE = 1;
const CANCELLED_EXIT_CODE = 130;

export const failCommand = (): void => {
  process.exitCode = FAILURE_EXIT_CODE;
};

export const reportCommandError = (renderer: Renderer, error: unknown): void => {
  renderer.error(error);
  thisMod.failCommand();
};

export const runCommand = async (
  command: LeafCommand,
  values: OptionValues,
  renderer: Renderer,
): Promise<void> => {
  renderer.intro(command.title);

  try {
    const outcome = await command.run({ values, ui: renderer.ui });

    renderer.ui.progress.stop();
    renderer.result(outcome.result);
    renderer.success(outcome.success);
  } catch (error) {
    renderer.ui.progress.stop();

    if (error instanceof CLIPromptCancelledError) {
      renderer.cancel(error.message);

      process.exitCode = CANCELLED_EXIT_CODE;

      return;
    }

    thisMod.reportCommandError(renderer, error);
    renderer.failure(command.failure ?? DEFAULT_FAILURE_MESSAGE);
  }
};
