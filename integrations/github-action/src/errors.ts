export class ActionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "ActionError";
  }
}

export class ActionMissingReleaseCommitError extends ActionError {
  constructor() {
    super("unirelman version changed files but created no commit");

    this.name = "ActionMissingReleaseCommitError";
  }
}
