export class CalverError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "CalverError";
  }
}

export class CalverFutureVersionError extends CalverError {
  readonly version: string;
  readonly date: string;

  constructor(version: string, date: string) {
    super(`Current version ${version} is dated after today (${date})`);

    this.name = "CalverFutureVersionError";
    this.version = version;
    this.date = date;
  }
}
