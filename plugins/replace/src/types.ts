export type ReplaceInput = {
  readonly scopeName: string;
  readonly currentVersion: string | undefined;
  readonly nextVersion: string;
};

export type ReplaceSearch = RegExp | ((input: ReplaceInput) => RegExp);

export type ReplaceFile = {
  readonly path: string;
  readonly scope: string;
  readonly search: ReplaceSearch;
  readonly replace: (input: ReplaceInput) => string;
  readonly allowNoMatch?: boolean;
};

export type ReplacePluginOptions = {
  readonly files: readonly ReplaceFile[];
};

export type ResolvedReplaceFile = Omit<ReplaceFile, "allowNoMatch"> & {
  readonly allowNoMatch: boolean;
};

export type ResolvedReplacePluginOptions = {
  readonly files: readonly ResolvedReplaceFile[];
};
