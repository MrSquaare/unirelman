import type { ScopeMap, ScopeResultMap } from "../types/scope";

export const filterScopeMap = (scopes: ScopeMap, scopeNames: ReadonlySet<string>): ScopeMap => {
  const filteredScopes: ScopeMap = {};

  for (const scopeName in scopes) {
    if (!scopeNames.has(scopeName)) {
      continue;
    }

    filteredScopes[scopeName] = scopes[scopeName];
  }

  return filteredScopes;
};

export const filterScopeResultMap = <TValue>(
  resultMap: ScopeResultMap<TValue>,
  scopeNames: ReadonlySet<string>,
): ScopeResultMap<TValue> => {
  const filteredMap: ScopeResultMap<TValue> = {};

  for (const key in resultMap) {
    if (!scopeNames.has(key)) {
      continue;
    }

    filteredMap[key] = resultMap[key];
  }

  return filteredMap;
};
