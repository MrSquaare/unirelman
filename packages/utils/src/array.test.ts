import { afterEach, describe, expect, it, vi } from "vitest";

import { isNonEmptyArray } from "./array";

describe("isNonEmptyArray", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when array has items", () => {
    expect(isNonEmptyArray(["alpha"])).toEqual(true);
  });

  it("should return false when array is empty", () => {
    expect(isNonEmptyArray([])).toEqual(false);
  });
});
