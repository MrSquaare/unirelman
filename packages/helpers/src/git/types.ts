export type GitTagFormatInput = {
  readonly scopeName: string;
  readonly version: string;
  readonly isRootScope: boolean;
};

export type GitTagFormat = (input: GitTagFormatInput) => string;
