import { afterEach, describe, expect, it, vi } from "vitest";

import type { ScopeVersionMap } from "../types/phases";

import { createScopeVersionMap, createVersion } from "../testing/fixtures/phase";
import { SCOPE_NAMES, createScopeMap } from "../testing/fixtures/scope";
import { filterScopeMap, filterScopeResultMap } from "./scope";

describe("filterScopeMap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep only configured scope names", () => {
    const scopeMap = createScopeMap();

    expect(filterScopeMap(scopeMap, new Set([SCOPE_NAMES.ALPHA]))).toEqual({
      [SCOPE_NAMES.ALPHA]: scopeMap[SCOPE_NAMES.ALPHA],
    });
  });

  it("should return empty map when no scope name is configured", () => {
    expect(filterScopeMap(createScopeMap(), new Set())).toEqual({});
  });

  it("should return empty map when scopes input is empty", () => {
    expect(filterScopeMap({}, new Set([SCOPE_NAMES.ALPHA]))).toEqual({});
  });
});

describe("filterScopeResultMap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep only included scopes", () => {
    const scopeVersionMap = createScopeVersionMap();

    expect(
      filterScopeResultMap(
        {
          ...scopeVersionMap,
          [SCOPE_NAMES.REMOVED]: createVersion(),
        },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      ),
    ).toEqual(scopeVersionMap);
  });

  it("should return empty object when no scopes are included", () => {
    expect(filterScopeResultMap(createScopeVersionMap(), new Set())).toEqual({});
  });

  it("should return empty map when result map is empty", () => {
    expect(filterScopeResultMap({} as ScopeVersionMap, new Set([SCOPE_NAMES.ALPHA]))).toEqual({});
  });
});
