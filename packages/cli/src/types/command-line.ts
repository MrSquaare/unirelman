import type { Command } from "./command";
import type { OptionsDef } from "./option";
import type { OutputMode } from "./renderer";

export type GlobalOptions = {
  readonly config: string | undefined;
  readonly verbose: boolean;
  readonly outputMode: OutputMode | undefined;
  readonly help: boolean;
  readonly version: boolean;
};

export type PositionalToken = {
  readonly kind: "positional";
  readonly value: string;
};

export type UnknownOptionToken = {
  readonly kind: "unknownOption";
  readonly rawName: string;
};

export type ArgvToken = PositionalToken | UnknownOptionToken;

export type CommandLine = {
  readonly globalOptionDefs: OptionsDef;
  readonly options: GlobalOptions;
  readonly tokens: readonly ArgvToken[];
};

export type CommandTarget = {
  readonly command: Command;
  readonly names: readonly string[];
};
