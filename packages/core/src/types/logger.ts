export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

export type CreateLogger = (source: string) => Logger;
