import { describe, expect, it } from "vitest";

import { isNonEmptyArray } from "./array";

describe("isNonEmptyArray", () => {
  it("should return true when array has items", () => {
    expect(isNonEmptyArray(["alpha"])).toEqual(true);
  });

  it("should return false when array is empty", () => {
    expect(isNonEmptyArray([])).toEqual(false);
  });
});
