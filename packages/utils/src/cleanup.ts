import { resolveErrorMessage } from "./error";

export class CleanupError extends AggregateError {
  readonly error: unknown;
  readonly cleanupError: unknown;

  constructor(error: unknown, cleanupError: unknown) {
    super(
      [error, cleanupError],
      `${resolveErrorMessage(error)}\nCleanup failed: ${resolveErrorMessage(cleanupError)}`,
      { cause: error },
    );

    this.name = "CleanupError";
    this.error = error;
    this.cleanupError = cleanupError;
  }
}

export const runWithCleanup = async <TResult>(
  task: () => Promise<TResult>,
  cleanup: (error?: unknown) => Promise<void>,
): Promise<TResult> => {
  let result: TResult;

  try {
    result = await task();
  } catch (error) {
    try {
      await cleanup(error);
    } catch (cleanupError) {
      throw new CleanupError(error, cleanupError);
    }

    throw error;
  }

  await cleanup();

  return result;
};
