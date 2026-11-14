import type { CreateLogger } from "@unirelman/core";

import type { CommandSuccess } from "./command";

export const OUTPUT_MODES = ["interactive", "plain", "json"] as const;

export type OutputMode = (typeof OUTPUT_MODES)[number];

export type TerminalState = {
  readonly stdin: boolean;
  readonly stderr: boolean;
};

export type PromptOption<TValue> = {
  readonly value: TValue;
  readonly label: string;
};

export type SelectPrompt<TValue> = {
  readonly message: string;
  readonly option: string;
  readonly options: readonly PromptOption<TValue>[];
};

export type TextPrompt = {
  readonly message: string;
  readonly option: string;
  readonly validate?: (value: string) => string | undefined;
};

export interface CommandProgress {
  start(message: string): void;
  stop(): void;
}

export interface CommandUI {
  readonly progress: CommandProgress;
  select<TValue>(prompt: SelectPrompt<TValue>): Promise<TValue>;
  multiselect<TValue>(prompt: SelectPrompt<TValue>): Promise<TValue[]>;
  text(prompt: TextPrompt): Promise<string>;
}

export interface Renderer {
  readonly ui: CommandUI;
  createLogger: CreateLogger;
  print(text: string): void;
  printError(text: string): void;
  intro(title: string): void;
  result(value: unknown): void;
  success(success: CommandSuccess): void;
  cancel(message: string): void;
  error(error: unknown): void;
  failure(message: string): void;
}
