export class GroupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "GroupError";
  }
}

export class GroupEmptyError extends GroupError {
  readonly groupName: string;

  constructor(groupName: string) {
    super(`Group "${groupName}" has no scope`);

    this.name = "GroupEmptyError";
    this.groupName = groupName;
  }
}

export class GroupUnknownScopeError extends GroupError {
  readonly groupName: string;
  readonly scopeName: string;
  readonly knownScopeNames: readonly string[];

  constructor(groupName: string, scopeName: string, knownScopeNames: readonly string[]) {
    super(
      `Unknown scope "${scopeName}" in group "${groupName}". Known scopes: ${knownScopeNames.join(", ")}`,
    );

    this.name = "GroupUnknownScopeError";
    this.groupName = groupName;
    this.scopeName = scopeName;
    this.knownScopeNames = knownScopeNames;
  }
}

export class GroupDuplicateScopeError extends GroupError {
  readonly scopeName: string;

  constructor(scopeName: string) {
    super(`Scope "${scopeName}" is in more than one group`);

    this.name = "GroupDuplicateScopeError";
    this.scopeName = scopeName;
  }
}
