import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIError,
  CLIDuplicateOptionError,
  CLIInvalidOptionAliasError,
  CLIInvalidOptionTypeError,
  CLIReservedOptionError,
  CLIMissingOptionValueError,
  CLIUnexpectedArgumentError,
  CLIUnexpectedOptionValueError,
  CLIUnknownCommandError,
  CLIUnknownOptionError,
  CLIConflictingOutputModesError,
  CLIPromptCancelledError,
  CLIPromptUnavailableError,
  CLIReservedCommandNameError,
} from "./errors";

describe("CLIError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct CLIError with name and message", () => {
      const error = new CLIError("cli failure");

      expect(error.name).toEqual("CLIError");
      expect(error.message).toEqual("cli failure");
    });

    it("should construct CLIError with a cause", () => {
      const cause = new Error("root cause");
      const error = new CLIError("cli failure", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("CLIConflictingOutputModesError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct CLIConflictingOutputModesError with the conflicting options", () => {
      const error = new CLIConflictingOutputModesError(["--plain", "--json"]);

      expect(error.name).toEqual("CLIConflictingOutputModesError");
      expect(error.message).toEqual("Options --plain and --json cannot be used together");
      expect(error.options).toEqual(["--plain", "--json"]);
    });

    it("should list every conflicting option but the last with commas", () => {
      const error = new CLIConflictingOutputModesError(["--interactive", "--plain", "--json"]);

      expect(error.message).toEqual(
        "Options --interactive, --plain and --json cannot be used together",
      );
    });
  });
});

describe("CLIMissingOptionValueError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIMissingOptionValueError("--level");

      expect(error.message).toEqual('Option "--level" requires a value');
      expect(error.name).toEqual("CLIMissingOptionValueError");
      expect(error.option).toEqual("--level");
    });
  });
});

describe("CLIUnexpectedOptionValueError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIUnexpectedOptionValueError("--dry-run");

      expect(error.message).toEqual('Option "--dry-run" takes no value');
      expect(error.name).toEqual("CLIUnexpectedOptionValueError");
      expect(error.option).toEqual("--dry-run");
    });
  });
});

describe("CLIReservedCommandNameError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct CLIReservedCommandNameError with command name", () => {
      const error = new CLIReservedCommandNameError("run");

      expect(error.name).toEqual("CLIReservedCommandNameError");
      expect(error.message).toEqual('Plugin "run" uses a reserved command name');
      expect(error.commandName).toEqual("run");
    });
  });
});

describe("CLIUnknownCommandError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIUnknownCommandError("nope", ["version", "publish"]);

      expect(error.message).toEqual('Unknown command "nope". Known commands: version, publish');
      expect(error.name).toEqual("CLIUnknownCommandError");
      expect(error.commandName).toEqual("nope");
      expect(error.knownCommandNames).toEqual(["version", "publish"]);
    });
  });
});

describe("CLIUnknownOptionError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIUnknownOptionError("--levle", ["--level", "--message"]);

      expect(error.message).toEqual('Unknown option "--levle". Known options: --level, --message');
      expect(error.name).toEqual("CLIUnknownOptionError");
      expect(error.option).toEqual("--levle");
      expect(error.knownOptions).toEqual(["--level", "--message"]);
    });

    it("should construct without known options when the command has none", () => {
      const error = new CLIUnknownOptionError("--levle", []);

      expect(error.message).toEqual('Unknown option "--levle"');
    });
  });
});

describe("CLIReservedOptionError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIReservedOptionError("unirelman semver pre", "--verbose");

      expect(error.message).toEqual(
        'Command "unirelman semver pre" declares the global option "--verbose"',
      );
      expect(error.name).toEqual("CLIReservedOptionError");
      expect(error.commandPath).toEqual("unirelman semver pre");
      expect(error.option).toEqual("--verbose");
    });
  });
});

describe("CLIDuplicateOptionError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIDuplicateOptionError("unirelman semver pre", "--exit");

      expect(error.message).toEqual(
        'Command "unirelman semver pre" declares the option "--exit" more than once',
      );
      expect(error.name).toEqual("CLIDuplicateOptionError");
      expect(error.commandPath).toEqual("unirelman semver pre");
      expect(error.option).toEqual("--exit");
    });
  });
});

describe("CLIInvalidOptionAliasError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIInvalidOptionAliasError("unirelman semver pre", "ch");

      expect(error.message).toEqual(
        'Command "unirelman semver pre" declares the alias "ch", which is not one character',
      );
      expect(error.name).toEqual("CLIInvalidOptionAliasError");
      expect(error.commandPath).toEqual("unirelman semver pre");
      expect(error.alias).toEqual("ch");
    });
  });
});

describe("CLIUnexpectedArgumentError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIUnexpectedArgumentError("extra");

      expect(error.message).toEqual('Unexpected argument "extra"');
      expect(error.name).toEqual("CLIUnexpectedArgumentError");
      expect(error.argument).toEqual("extra");
    });
  });
});

describe("CLIInvalidOptionTypeError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new CLIInvalidOptionTypeError(["--dry-run"]);

      expect(error.message).toEqual(
        "Options with a value of another type than declared: --dry-run",
      );
      expect(error.name).toEqual("CLIInvalidOptionTypeError");
      expect(error.options).toEqual(["--dry-run"]);
    });
  });
});

describe("CLIPromptUnavailableError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct CLIPromptUnavailableError with option", () => {
      const error = new CLIPromptUnavailableError("--scope");

      expect(error.name).toEqual("CLIPromptUnavailableError");
      expect(error.message).toEqual(
        "--scope is required: prompts are unavailable in plain and JSON modes",
      );
      expect(error.option).toEqual("--scope");
    });
  });
});

describe("CLIPromptCancelledError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should construct CLIPromptCancelledError with the cancellation message", () => {
      const error = new CLIPromptCancelledError();

      expect(error.name).toEqual("CLIPromptCancelledError");
      expect(error.message).toEqual("Operation cancelled");
    });
  });
});
