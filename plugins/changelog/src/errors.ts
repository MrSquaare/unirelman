export class ChangelogError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "ChangelogError";
  }
}

export class ChangelogInvalidHeaderError extends ChangelogError {
  readonly header: string;

  constructor(header: string) {
    super(`Changelog header contains a "## " section heading: ${header}`);

    this.name = "ChangelogInvalidHeaderError";
    this.header = header;
  }
}

export class ChangelogInvalidSectionHeaderError extends ChangelogError {
  readonly sectionHeader: string;

  constructor(sectionHeader: string) {
    super(`Changelog section header is not one line starting with "## ": ${sectionHeader}`);

    this.name = "ChangelogInvalidSectionHeaderError";
    this.sectionHeader = sectionHeader;
  }
}
