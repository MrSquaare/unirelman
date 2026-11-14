export type GroupRecord<TScopeName extends string = string> = Readonly<
  Record<string, readonly TScopeName[]>
>;

export type Group = {
  readonly name: string;
  readonly scopes: readonly string[];
};

export type GroupTarget = {
  readonly group: string | undefined;
  readonly scopes: readonly string[];
};
