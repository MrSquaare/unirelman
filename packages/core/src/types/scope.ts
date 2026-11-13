export interface ScopeMeta {}

export type ScopeName = string;

export type Scope = {
  readonly name: string;
  readonly path: string;
  readonly meta: ScopeMeta;
};

export type ScopeMap = Record<ScopeName, Scope>;

export type ScopeResultMap<TValue = unknown> = Record<ScopeName, TValue>;
