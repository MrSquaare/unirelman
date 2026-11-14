export class GitHubError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "GitHubError";
  }
}

export class GitHubMissingOptionError extends GitHubError {
  readonly optionName: string;
  readonly environmentVariables: readonly string[];

  constructor(optionName: string, environmentVariables: readonly string[]) {
    super(
      `Missing GitHub plugin option "${optionName}": none of ${environmentVariables.join(", ")} is set`,
    );

    this.name = "GitHubMissingOptionError";
    this.optionName = optionName;
    this.environmentVariables = environmentVariables;
  }
}

export class GitHubInvalidRepositoryError extends GitHubError {
  readonly repository: string;

  constructor(repository: string) {
    super(`Invalid GitHub repository "${repository}": expected the "owner/name" format`);

    this.name = "GitHubInvalidRepositoryError";
    this.repository = repository;
  }
}

export class GitHubUnknownLatestScopeError extends GitHubError {
  readonly scopeName: string;

  constructor(scopeName: string) {
    super(
      `Scope "${scopeName}" of the GitHub plugin option "makeLatest" is not a scope of the plugin`,
    );

    this.name = "GitHubUnknownLatestScopeError";
    this.scopeName = scopeName;
  }
}
