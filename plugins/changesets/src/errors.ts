import { CHANGE_LEVELS } from "@unirelman/core";
import { resolveErrorMessage } from "@unirelman/utils";

import type { ChangesetField } from "./types";

export class ChangesetsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "ChangesetsError";
  }
}

export class ChangesetsInvalidScopesError extends ChangesetsError {
  readonly scopeNames: readonly string[];
  readonly knownScopeNames: readonly string[];

  constructor(scopeNames: readonly string[], knownScopeNames: readonly string[]) {
    super(
      `Unknown scopes ${scopeNames.map((scopeName) => `"${scopeName}"`).join(", ")}. Known scopes: ${knownScopeNames.join(", ")}`,
    );

    this.name = "ChangesetsInvalidScopesError";
    this.scopeNames = scopeNames;
    this.knownScopeNames = knownScopeNames;
  }
}

export class ChangesetsInvalidLevelError extends ChangesetsError {
  readonly level: string;

  constructor(level: string) {
    super(`Unknown level "${level}". Known levels: ${CHANGE_LEVELS.join(", ")}`);

    this.name = "ChangesetsInvalidLevelError";
    this.level = level;
  }
}

export class ChangesetsMissingFrontmatterError extends ChangesetsError {
  constructor() {
    super("Changeset has no frontmatter block");

    this.name = "ChangesetsMissingFrontmatterError";
  }
}

export class ChangesetsMissingFieldError extends ChangesetsError {
  readonly field: ChangesetField;

  constructor(field: ChangesetField) {
    super(`Changeset has no ${field}`);

    this.name = "ChangesetsMissingFieldError";
    this.field = field;
  }
}

export class ChangesetsInvalidFileError extends ChangesetsError {
  readonly filePath: string;

  constructor(filePath: string, cause: unknown) {
    super(`Invalid changeset file "${filePath}": ${resolveErrorMessage(cause)}`, { cause });

    this.name = "ChangesetsInvalidFileError";
    this.filePath = filePath;
  }
}
