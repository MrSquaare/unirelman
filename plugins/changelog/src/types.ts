import type { ChangeLevel } from "@unirelman/core";

export type ChangelogMode = "root" | "scope";

export type ChangelogHeaderInput = {
  readonly scopeName: string;
};

export type ChangelogScopeHeader = string | ((input: ChangelogHeaderInput) => string);

export type ChangelogSectionInput = {
  readonly scopeName: string;
  readonly version: string;
};

export type ChangelogSectionHeader = (input: ChangelogSectionInput) => string;

export type ChangelogNoChangeMessage = (input: ChangelogSectionInput) => string;

export type ChangelogLevelHeaders = Readonly<Record<ChangeLevel, string>>;

type ChangelogContentOptions = {
  readonly sectionHeader?: ChangelogSectionHeader;
  readonly levelHeaders?: Partial<ChangelogLevelHeaders>;
  readonly noChangeMessage?: ChangelogNoChangeMessage;
};

export type ChangelogPluginOptions = ChangelogContentOptions &
  (
    | { readonly mode?: "root"; readonly header?: string }
    | { readonly mode: "scope"; readonly header?: ChangelogScopeHeader }
  );

type ResolvedChangelogContentOptions = {
  readonly sectionHeader: ChangelogSectionHeader;
  readonly levelHeaders: ChangelogLevelHeaders;
  readonly noChangeMessage: ChangelogNoChangeMessage;
};

export type ResolvedChangelogPluginOptions = ResolvedChangelogContentOptions &
  (
    | { readonly mode: "root"; readonly header: string }
    | { readonly mode: "scope"; readonly header: ChangelogScopeHeader }
  );
