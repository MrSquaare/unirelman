export const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => {
  return (
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
  );
};

export const resolveErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};
