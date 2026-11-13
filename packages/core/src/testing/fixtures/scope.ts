import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { Scope, ScopeMap } from "../../types/scope";

import { SCOPE_NAMES, SCOPE_PATHS } from "./constants";

export { SCOPE_NAMES, SCOPE_PATHS } from "./constants";

export const createScope = defineObjectGenerator<Scope>(() => ({
  name: SCOPE_NAMES.ALPHA,
  path: SCOPE_PATHS[SCOPE_NAMES.ALPHA],
  meta: {},
}));

export const createScopeSet = () => new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]);

export const createScopeMap = defineObjectGenerator<ScopeMap>(() => ({
  [SCOPE_NAMES.ALPHA]: createScope(),
  [SCOPE_NAMES.BETA]: createScope({
    extends: { name: SCOPE_NAMES.BETA, path: SCOPE_PATHS[SCOPE_NAMES.BETA] },
  }),
}));
