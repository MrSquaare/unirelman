import type { ScopeResultMap } from "../types/scope";

export const filterScopeResultMap = <TValue>(
  resultMap: ScopeResultMap<TValue>,
  scopeNames: ReadonlySet<string>,
): ScopeResultMap<TValue> => {
  return new Map([...resultMap].filter(([scopeName]) => scopeNames.has(scopeName)));
};
