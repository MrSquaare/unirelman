import type { CANCEL_SYMBOL } from "@clack/prompts";
import type { Logger } from "@unirelman/core";

import {
  cancel,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";

import type { CommandUI, PromptOption, Renderer } from "../types/renderer";

import { CLI_NAME } from "../constants";
import { CLIPromptCancelledError } from "../errors";
import { formatCommandError } from "./error";
import * as thisMod from "./interactive";
import { writeError, writeOutput } from "./stream";

export type InteractiveRendererOptions = {
  readonly verbose: boolean;
};

export interface InteractiveProgress {
  hasStarted(): boolean;
  start(message: string): void;
  stop(): void;
  writeAround(write: () => void): void;
}

type RunningProgress = {
  readonly spinner: ReturnType<typeof spinner>;
  readonly message: string;
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const stderr = process.stderr;

const resolveClackOptions = <TValue>(
  options: readonly PromptOption<TValue>[],
): { value: PromptOption<TValue>; label: string }[] => {
  return options.map((option) => ({ value: option, label: option.label }));
};

export const createInteractiveProgress = (): InteractiveProgress => {
  let running: RunningProgress | undefined;
  let started = false;

  return {
    hasStarted: () => started,
    start: (message) => {
      started = true;

      log.message("", { output: stderr, spacing: 0 });

      running = {
        spinner: spinner({ output: stderr, withGuide: false, frames: SPINNER_FRAMES }),
        message,
      };

      running.spinner.start(message);
    },
    stop: () => {
      running?.spinner.clear();
      running = undefined;
    },
    writeAround: (write) => {
      running?.spinner.clear();
      write();
      running?.spinner.start(running.message);
    },
  };
};

export const resolvePromptValue = <TValue>(value: TValue | typeof CANCEL_SYMBOL): TValue => {
  if (isCancel(value)) {
    throw new CLIPromptCancelledError();
  }

  return value;
};

export const createInteractiveCommandUI = (progress: InteractiveProgress): CommandUI => {
  return {
    progress: {
      start: (message) => progress.start(message),
      stop: () => progress.stop(),
    },
    select: async (prompt) => {
      const option = thisMod.resolvePromptValue(
        await select({
          message: prompt.message,
          options: resolveClackOptions(prompt.options),
          output: stderr,
        }),
      );

      return option.value;
    },
    multiselect: async (prompt) => {
      const selectedOptions = thisMod.resolvePromptValue(
        await multiselect({
          message: prompt.message,
          options: resolveClackOptions(prompt.options),
          required: true,
          output: stderr,
        }),
      );

      return selectedOptions.map(({ value }) => value);
    },
    text: async (prompt) => {
      const { validate } = prompt;

      return thisMod.resolvePromptValue(
        await text({
          message: prompt.message,
          validate: validate && ((value) => validate(value ?? "")),
          output: stderr,
        }),
      );
    },
  };
};

export const createInteractiveLogger = (
  source: string,
  verbose: boolean,
  progress: InteractiveProgress,
): Logger => {
  return {
    debug: (message) => {
      if (verbose) {
        progress.writeAround(() =>
          log.message(`${source}: ${message}`, { output: stderr, spacing: 0 }),
        );
      }
    },
    info: (message) => {
      if (verbose) {
        progress.writeAround(() =>
          log.info(`${source}: ${message}`, { output: stderr, spacing: 0 }),
        );
      }
    },
    warn: (message) => {
      progress.writeAround(() => log.warn(`${source}: ${message}`, { output: stderr, spacing: 0 }));
    },
  };
};

export const createInteractiveRenderer = (options: InteractiveRendererOptions): Renderer => {
  const progress = thisMod.createInteractiveProgress();
  const resolveSpacing = () => (progress.hasStarted() ? 0 : 1);

  return {
    ui: thisMod.createInteractiveCommandUI(progress),
    createLogger: (source) => thisMod.createInteractiveLogger(source, options.verbose, progress),
    print: (text) => writeOutput(text),
    printError: (text) => writeError(text),
    intro: (title) => intro(`${CLI_NAME} · ${title}`, { output: stderr }),
    result: () => undefined,
    success: ({ summary, message }) => {
      if (summary.length > 0) {
        log.message(summary.join("\n"), { output: stderr, spacing: resolveSpacing() });
      }

      outro(message, { output: stderr });
    },
    cancel: (message) => cancel(message, { output: stderr }),
    error: (error) =>
      progress.writeAround(() =>
        log.error(formatCommandError(error, options.verbose), {
          output: stderr,
          spacing: resolveSpacing(),
        }),
      ),
    failure: (message) => outro(message, { output: stderr }),
  };
};
