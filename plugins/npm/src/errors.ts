export class NpmError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "NpmError";
  }
}

export class NpmPackageJsonNotFoundError extends NpmError {
  readonly scopeName: string;
  readonly filePath: string;

  constructor(scopeName: string, filePath: string, options?: ErrorOptions) {
    super(`package.json not found for scope ${scopeName}: ${filePath}`, options);

    this.name = "NpmPackageJsonNotFoundError";
    this.scopeName = scopeName;
    this.filePath = filePath;
  }
}

export class NpmRegistryLookupError extends NpmError {
  readonly packageName: string;
  readonly version: string;
  readonly summary: string;

  constructor(packageName: string, version: string, summary: string) {
    super(`Failed to check whether ${packageName}@${version} is published: ${summary}`);

    this.name = "NpmRegistryLookupError";
    this.packageName = packageName;
    this.version = version;
    this.summary = summary;
  }
}

export class NpmPublishAuthError extends NpmError {
  readonly packageSpec: string;
  readonly errorCode: string;

  constructor(packageSpec: string, errorCode: string) {
    super(
      `Failed to publish ${packageSpec}: npm could not authenticate or authorize the publish (${errorCode})`,
    );

    this.name = "NpmPublishAuthError";
    this.packageSpec = packageSpec;
    this.errorCode = errorCode;
  }
}

export class NpmPublishError extends NpmError {
  readonly packageSpec: string;
  readonly summary: string;

  constructor(packageSpec: string, summary: string) {
    super(`Failed to publish ${packageSpec}: ${summary}`);

    this.name = "NpmPublishError";
    this.packageSpec = packageSpec;
    this.summary = summary;
  }
}

export class NpmInvalidPackageJsonVersionError extends NpmError {
  readonly scopeName: string;

  constructor(scopeName: string) {
    super(`Missing or invalid version in package.json for scope ${scopeName}`);

    this.name = "NpmInvalidPackageJsonVersionError";
    this.scopeName = scopeName;
  }
}

export class NpmUnsupportedPackageManagerError extends NpmError {
  readonly packageManagerField: string;
  readonly supportedPackageManagers: readonly string[];

  constructor(packageManagerField: string, supportedPackageManagers: readonly string[]) {
    super(
      `Unsupported packageManager "${packageManagerField}" in package.json. Supported package managers: ${supportedPackageManagers.join(", ")}`,
    );

    this.name = "NpmUnsupportedPackageManagerError";
    this.packageManagerField = packageManagerField;
    this.supportedPackageManagers = supportedPackageManagers;
  }
}

export class NpmUnresolvedSpecifierError extends NpmError {
  readonly packageName: string;
  readonly dependencyName: string;
  readonly specifier: string;

  constructor(packageName: string, dependencyName: string, specifier: string) {
    super(
      `Failed to publish ${packageName}: npm cannot resolve the specifier "${specifier}" of dependency ${dependencyName}`,
    );

    this.name = "NpmUnresolvedSpecifierError";
    this.packageName = packageName;
    this.dependencyName = dependencyName;
    this.specifier = specifier;
  }
}

export class NpmUnsupportedDependencyRangeError extends NpmError {
  readonly scopeName: string;
  readonly dependencyName: string;
  readonly specifier: string;
  readonly nextVersion: string;

  constructor(scopeName: string, dependencyName: string, specifier: string, nextVersion: string) {
    super(
      `Failed to update dependency ${dependencyName} of scope ${scopeName} to ${nextVersion}: only exact, ^ and ~ ranges can be updated, and "${specifier}" excludes ${nextVersion}`,
    );

    this.name = "NpmUnsupportedDependencyRangeError";
    this.scopeName = scopeName;
    this.dependencyName = dependencyName;
    this.specifier = specifier;
    this.nextVersion = nextVersion;
  }
}

export class NpmTarballNotFoundError extends NpmError {
  readonly packageName: string;
  readonly directory: string;

  constructor(packageName: string, directory: string) {
    super(`Failed to publish ${packageName}: packing wrote no tarball to ${directory}`);

    this.name = "NpmTarballNotFoundError";
    this.packageName = packageName;
    this.directory = directory;
  }
}
