import * as thisMod from "./error";

export const formatCommandError = (error: unknown, verbose: boolean): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (!verbose) {
    return error.message;
  }

  const stack = error.stack ?? error.message;

  if (error.cause === undefined) {
    return stack;
  }

  return `${stack}\nCaused by: ${thisMod.formatCommandError(error.cause, verbose)}`;
};
