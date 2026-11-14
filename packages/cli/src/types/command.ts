import type { OptionsDef, OptionValues, ParsedOptions } from "./option";
import type { CommandUI } from "./renderer";

export type CommandMeta = {
  readonly name: string;
  readonly description?: string;
};

export type CommandContext<TOptions extends OptionsDef> = {
  readonly options: ParsedOptions<TOptions>;
  readonly ui: CommandUI;
};

export type CommandSuccess = {
  readonly summary: readonly string[];
  readonly message: string;
};

export interface CommandDefinition<TOptions extends OptionsDef, TResult> {
  readonly meta: CommandMeta;
  readonly title: string;
  readonly options: TOptions;
  run(context: CommandContext<TOptions>): Promise<TResult>;
  success(result: TResult): CommandSuccess;
  readonly failure?: string;
}

export type CommandRunContext = {
  readonly values: OptionValues;
  readonly ui: CommandUI;
};

export type CommandOutcome = {
  readonly result: unknown;
  readonly success: CommandSuccess;
};

export interface LeafCommand {
  readonly meta: CommandMeta;
  readonly title: string;
  readonly options: OptionsDef;
  run(context: CommandRunContext): Promise<CommandOutcome>;
  readonly failure?: string;
}

export type CommandGroup = {
  readonly meta: CommandMeta;
  readonly subCommands: Readonly<Record<string, Command>>;
};

export type Command = LeafCommand | CommandGroup;
