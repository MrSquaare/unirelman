export class CLIError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "CLIError";
  }
}

export class CLIConflictingOutputModesError extends CLIError {
  readonly options: readonly string[];

  constructor(options: readonly string[]) {
    super(
      `Options ${options.slice(0, -1).join(", ")} and ${options.at(-1)} cannot be used together`,
    );

    this.name = "CLIConflictingOutputModesError";
    this.options = options;
  }
}

export class CLIMissingOptionValueError extends CLIError {
  readonly option: string;

  constructor(option: string) {
    super(`Option "${option}" requires a value`);

    this.name = "CLIMissingOptionValueError";
    this.option = option;
  }
}

export class CLIUnexpectedOptionValueError extends CLIError {
  readonly option: string;

  constructor(option: string) {
    super(`Option "${option}" takes no value`);

    this.name = "CLIUnexpectedOptionValueError";
    this.option = option;
  }
}

export class CLIReservedCommandNameError extends CLIError {
  readonly commandName: string;

  constructor(commandName: string) {
    super(`Plugin "${commandName}" uses a reserved command name`);

    this.name = "CLIReservedCommandNameError";
    this.commandName = commandName;
  }
}

export class CLIUnknownCommandError extends CLIError {
  readonly commandName: string;
  readonly knownCommandNames: readonly string[];

  constructor(commandName: string, knownCommandNames: readonly string[]) {
    super(`Unknown command "${commandName}". Known commands: ${knownCommandNames.join(", ")}`);

    this.name = "CLIUnknownCommandError";
    this.commandName = commandName;
    this.knownCommandNames = knownCommandNames;
  }
}

export class CLIUnknownOptionError extends CLIError {
  readonly option: string;
  readonly knownOptions: readonly string[];

  constructor(option: string, knownOptions: readonly string[]) {
    super(
      knownOptions.length === 0
        ? `Unknown option "${option}"`
        : `Unknown option "${option}". Known options: ${knownOptions.join(", ")}`,
    );

    this.name = "CLIUnknownOptionError";
    this.option = option;
    this.knownOptions = knownOptions;
  }
}

export class CLIReservedOptionError extends CLIError {
  readonly commandPath: string;
  readonly option: string;

  constructor(commandPath: string, option: string) {
    super(`Command "${commandPath}" declares the global option "${option}"`);

    this.name = "CLIReservedOptionError";
    this.commandPath = commandPath;
    this.option = option;
  }
}

export class CLIDuplicateOptionError extends CLIError {
  readonly commandPath: string;
  readonly option: string;

  constructor(commandPath: string, option: string) {
    super(`Command "${commandPath}" declares the option "${option}" more than once`);

    this.name = "CLIDuplicateOptionError";
    this.commandPath = commandPath;
    this.option = option;
  }
}

export class CLIInvalidOptionAliasError extends CLIError {
  readonly commandPath: string;
  readonly alias: string;

  constructor(commandPath: string, alias: string) {
    super(`Command "${commandPath}" declares the alias "${alias}", which is not one character`);

    this.name = "CLIInvalidOptionAliasError";
    this.commandPath = commandPath;
    this.alias = alias;
  }
}

export class CLIUnexpectedArgumentError extends CLIError {
  readonly argument: string;

  constructor(argument: string) {
    super(`Unexpected argument "${argument}"`);

    this.name = "CLIUnexpectedArgumentError";
    this.argument = argument;
  }
}

export class CLIInvalidOptionTypeError extends CLIError {
  readonly options: readonly string[];

  constructor(options: readonly string[]) {
    super(`Options with a value of another type than declared: ${options.join(", ")}`);

    this.name = "CLIInvalidOptionTypeError";
    this.options = options;
  }
}

export class CLIPromptUnavailableError extends CLIError {
  readonly option: string;

  constructor(option: string) {
    super(`${option} is required: prompts are unavailable in plain and JSON modes`);

    this.name = "CLIPromptUnavailableError";
    this.option = option;
  }
}

export class CLIPromptCancelledError extends CLIError {
  constructor() {
    super("Operation cancelled");

    this.name = "CLIPromptCancelledError";
  }
}
