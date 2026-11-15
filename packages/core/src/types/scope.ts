export interface ScopeMeta {}

export type ScopeName = string;

export type Scope = {
  readonly name: string;
  readonly path: string;
  readonly meta: ScopeMeta;
};

export type ScopeMap = ReadonlyMap<ScopeName, Scope>;

export type ScopeResultMap<TValue = unknown> = ReadonlyMap<ScopeName, TValue>;
