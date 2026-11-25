import { afterEach, describe, expect, it, vi } from "vitest";

import { createScopeVersionMap, createVersion } from "../testing/fixtures/phase";
import { SCOPE_NAMES } from "../testing/fixtures/scope";
import { filterScopeResultMap } from "./scope";

describe("filterScopeResultMap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep only included scopes", () => {
    const scopeVersionMap = createScopeVersionMap();

    expect(
      filterScopeResultMap(
        createScopeVersionMap({ extends: new Map([[SCOPE_NAMES.REMOVED, createVersion()]]) }),
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      ),
    ).toEqual(scopeVersionMap);
  });

  it("should return an empty map when no scopes are included", () => {
    expect(filterScopeResultMap(createScopeVersionMap(), new Set())).toEqual(new Map());
  });

  it("should return an empty map when the result map is empty", () => {
    expect(filterScopeResultMap(new Map(), new Set([SCOPE_NAMES.ALPHA]))).toEqual(new Map());
  });
});
