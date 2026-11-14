export class ReplaceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "ReplaceError";
  }
}

export class ReplaceUnknownScopeError extends ReplaceError {
  readonly filePath: string;
  readonly scopeName: string;

  constructor(filePath: string, scopeName: string) {
    super(
      `Replace entry of "${filePath}" names scope "${scopeName}", which is not a scope of the plugin`,
    );

    this.name = "ReplaceUnknownScopeError";
    this.filePath = filePath;
    this.scopeName = scopeName;
  }
}

export class ReplaceNoMatchError extends ReplaceError {
  readonly filePath: string;
  readonly search: RegExp;

  constructor(filePath: string, search: RegExp) {
    super(`File "${filePath}" has no match for ${search}`);

    this.name = "ReplaceNoMatchError";
    this.filePath = filePath;
    this.search = search;
  }
}
