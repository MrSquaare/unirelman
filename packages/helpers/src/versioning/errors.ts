export class VersioningError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "VersioningError";
  }
}

export class VersioningInvalidVersionError extends VersioningError {
  readonly schemeName: string;
  readonly value: string;

  constructor(schemeName: string, value: string) {
    super(`Invalid ${schemeName} version: ${value}`);

    this.name = "VersioningInvalidVersionError";
    this.schemeName = schemeName;
    this.value = value;
  }
}

export class VersioningFixedVersionMismatchError extends VersioningError {
  readonly currentVersions: Readonly<Record<string, string | undefined>>;

  constructor(currentVersions: Readonly<Record<string, string | undefined>>) {
    const versions = Object.entries(currentVersions)
      .map(([scopeName, version]) => `${scopeName} (${version ?? "no version"})`)
      .join(", ");

    super(`Fixed scopes must share the same current version: ${versions}`);

    this.name = "VersioningFixedVersionMismatchError";
    this.currentVersions = currentVersions;
  }
}

export class VersioningMissingCurrentVersionError extends VersioningError {
  readonly scopeNames: readonly string[];

  constructor(scopeNames: readonly string[]) {
    super(`Scopes with changes have no current version: ${scopeNames.join(", ")}`);

    this.name = "VersioningMissingCurrentVersionError";
    this.scopeNames = scopeNames;
  }
}
