import { resolveErrorMessage } from "@unirelman/utils";

export class CoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "CoreError";
  }
}

export class CoreEmptyScopesError extends CoreError {
  constructor() {
    super("At least one scope is required");

    this.name = "CoreEmptyScopesError";
  }
}

export class CoreEmptyScopeNameError extends CoreError {
  constructor() {
    super("Scope name cannot be empty");

    this.name = "CoreEmptyScopeNameError";
  }
}

export class CoreReservedScopeNameError extends CoreError {
  readonly scopeName: string;

  constructor(scopeName: string) {
    super(`Scope name "${scopeName}" is reserved: it is a property of Object.prototype`);

    this.name = "CoreReservedScopeNameError";
    this.scopeName = scopeName;
  }
}

export class CoreDuplicateScopeNameError extends CoreError {
  readonly scopeName: string;

  constructor(scopeName: string) {
    super(`Scope name "${scopeName}" is duplicated`);

    this.name = "CoreDuplicateScopeNameError";
    this.scopeName = scopeName;
  }
}

export class CoreScopePathOutsideCwdError extends CoreError {
  readonly scopePath: string;

  constructor(scopePath: string) {
    super(`Scope path "${scopePath}" is outside of the current working directory`);

    this.name = "CoreScopePathOutsideCwdError";
    this.scopePath = scopePath;
  }
}

export class CoreDuplicateScopePathError extends CoreError {
  readonly scopePath: string;

  constructor(scopePath: string) {
    super(`Scope path "${scopePath}" is duplicated`);

    this.name = "CoreDuplicateScopePathError";
    this.scopePath = scopePath;
  }
}

export class CoreInvalidConfigError extends CoreError {
  readonly details: string;

  constructor(details: string) {
    super(`Invalid config\n${details}`);

    this.name = "CoreInvalidConfigError";
    this.details = details;
  }
}

export class CoreEmptyConfigPluginScopesError extends CoreError {
  readonly pluginName: string;

  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" config scopes must not be empty`);

    this.name = "CoreEmptyConfigPluginScopesError";
    this.pluginName = pluginName;
  }
}

export class CoreEmptyConfigPluginScopeNameError extends CoreError {
  readonly pluginName: string;

  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" config has an empty scope name`);

    this.name = "CoreEmptyConfigPluginScopeNameError";
    this.pluginName = pluginName;
  }
}

export class CoreUnknownConfigPluginScopeError extends CoreError {
  readonly pluginName: string;
  readonly scopeName: string;
  readonly knownScopeNames: readonly string[];

  constructor(pluginName: string, scopeName: string, knownScopeNames: readonly string[]) {
    super(
      `Unknown scope "${scopeName}" in plugin "${pluginName}" config. Known scopes: ${knownScopeNames.join(", ")}`,
    );

    this.name = "CoreUnknownConfigPluginScopeError";
    this.pluginName = pluginName;
    this.scopeName = scopeName;
    this.knownScopeNames = knownScopeNames;
  }
}

export class CoreDuplicatePluginRegistrationError extends CoreError {
  readonly pluginName: string;

  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" is registered more than once`);

    this.name = "CoreDuplicatePluginRegistrationError";
    this.pluginName = pluginName;
  }
}

export class CoreMissingPhaseProviderError extends CoreError {
  readonly phaseName: string;
  readonly scopeName: string;

  constructor(phaseName: string, scopeName: string) {
    super(`Scope "${scopeName}" has changes but no plugin provides the ${phaseName} phase for it`);

    this.name = "CoreMissingPhaseProviderError";
    this.phaseName = phaseName;
    this.scopeName = scopeName;
  }
}

export class CoreConflictingPhaseProvidersError extends CoreError {
  readonly phaseName: string;
  readonly scopeName: string;
  readonly pluginNames: readonly string[];

  constructor(phaseName: string, scopeName: string, pluginNames: readonly string[]) {
    super(
      `Scope "${scopeName}" has several plugins providing the ${phaseName} phase: ${pluginNames.join(", ")}`,
    );

    this.name = "CoreConflictingPhaseProvidersError";
    this.phaseName = phaseName;
    this.scopeName = scopeName;
    this.pluginNames = pluginNames;
  }
}

export class CoreUnstableNextVersionError extends CoreError {
  readonly scopeName: string;
  readonly previousVersion: string;

  constructor(scopeName: string, previousVersion: string) {
    super(
      `Dependency changes moved the next version of scope "${scopeName}" away from ${previousVersion}`,
    );

    this.name = "CoreUnstableNextVersionError";
    this.scopeName = scopeName;
    this.previousVersion = previousVersion;
  }
}

export class CoreEmptyFileOperationPathError extends CoreError {
  readonly scopeName: string;
  readonly fileType: string;

  constructor(scopeName: string, fileType: string) {
    super(`File operation "${fileType}" for scope "${scopeName}" has an empty path`);

    this.name = "CoreEmptyFileOperationPathError";
    this.scopeName = scopeName;
    this.fileType = fileType;
  }
}

export class CoreConflictingFileOperationError extends CoreError {
  readonly path: string;

  constructor(path: string) {
    super(`File operations for "${path}" have different actions or contents`);

    this.name = "CoreConflictingFileOperationError";
    this.path = path;
  }
}

export class CoreFileNotFoundError extends CoreError {
  readonly filePath: string;

  constructor(filePath: string, options?: ErrorOptions) {
    super(`File not found: ${filePath}`, options);

    this.name = "CoreFileNotFoundError";
    this.filePath = filePath;
  }
}

export class CorePhaseError extends CoreError {
  readonly phaseName: string;
  readonly pluginName: string;

  constructor(phaseName: string, pluginName: string, cause: unknown) {
    super(
      `Plugin "${pluginName}" failed in the ${phaseName} phase: ${resolveErrorMessage(cause)}`,
      { cause },
    );

    this.name = "CorePhaseError";
    this.phaseName = phaseName;
    this.pluginName = pluginName;
  }
}

export class CoreUnknownPhaseResultScopeError extends CoreError {
  readonly phaseName: string;
  readonly pluginName: string;
  readonly scopeName: string;

  constructor(phaseName: string, pluginName: string, scopeName: string) {
    super(
      `Plugin "${pluginName}" returned a ${phaseName} result for scope "${scopeName}", which is not one of its scopes`,
    );

    this.name = "CoreUnknownPhaseResultScopeError";
    this.phaseName = phaseName;
    this.pluginName = pluginName;
    this.scopeName = scopeName;
  }
}

export class CoreTeardownError extends CoreError {
  readonly errors: readonly CorePhaseError[];

  constructor(errors: readonly CorePhaseError[]) {
    super(
      `Several plugins failed in the teardown phase:\n${errors.map((error) => error.message).join("\n")}`,
    );

    this.name = "CoreTeardownError";
    this.errors = errors;
  }
}
