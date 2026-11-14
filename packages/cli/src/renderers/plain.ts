import type { Logger } from "@unirelman/core";

import type { CommandUI, Renderer } from "../types/renderer";

import { CLI_NAME } from "../constants";
import { CLIPromptUnavailableError } from "../errors";
import { formatCommandError } from "./error";
import * as thisMod from "./plain";
import { writeError, writeOutput } from "./stream";

export type PlainRendererOptions = {
  readonly verbose: boolean;
};

export const createPlainCommandUI = (): CommandUI => {
  return {
    progress: {
      start: () => undefined,
      stop: () => undefined,
    },
    select: (prompt) => Promise.reject(new CLIPromptUnavailableError(prompt.option)),
    multiselect: (prompt) => Promise.reject(new CLIPromptUnavailableError(prompt.option)),
    text: (prompt) => Promise.reject(new CLIPromptUnavailableError(prompt.option)),
  };
};

export const createPlainLogger = (source: string, verbose: boolean): Logger => {
  return {
    debug: (message) => {
      if (verbose) {
        writeError(`${source}: ${message}`);
      }
    },
    info: (message) => {
      if (verbose) {
        writeError(`${source}: ${message}`);
      }
    },
    warn: (message) => {
      writeError(`${source}: warning: ${message}`);
    },
  };
};

export const createPlainRenderer = (options: PlainRendererOptions): Renderer => {
  return {
    ui: thisMod.createPlainCommandUI(),
    createLogger: (source) => thisMod.createPlainLogger(source, options.verbose),
    print: (text) => writeOutput(text),
    printError: (text) => writeError(text),
    intro: (title) => writeError(`${CLI_NAME} · ${title}`),
    result: () => undefined,
    success: ({ summary, message }) => {
      for (const line of [...summary, message]) {
        writeError(line);
      }
    },
    cancel: (message) => writeError(message),
    error: (error) => writeError(`error: ${formatCommandError(error, options.verbose)}`),
    failure: (message) => writeError(message),
  };
};
