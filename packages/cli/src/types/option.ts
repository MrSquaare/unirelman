export type BooleanOptionDef = {
  readonly type: "boolean";
  readonly description: string;
  readonly alias?: string;
};

export type StringOptionDef = {
  readonly type: "string";
  readonly description: string;
  readonly alias?: string;
  readonly valueHint?: string;
};

export type OptionDef = BooleanOptionDef | StringOptionDef;

export type OptionsDef = Readonly<Record<string, OptionDef>>;

export type OptionValues = Readonly<Record<string, string | boolean>>;

export type ParsedOptions<TOptions extends OptionsDef> = {
  readonly [TKey in keyof TOptions]:
    | (TOptions[TKey] extends BooleanOptionDef ? boolean : string)
    | undefined;
};
