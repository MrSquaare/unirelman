import { afterEach, describe, expect, it, vi } from "vitest";

import { mergeArrayMaps, mergeMaps } from "./merge";

describe("mergeMaps", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should merge two maps", () => {
    expect(mergeMaps(new Map([["a", 1]]), new Map([["b", 2]]))).toEqual(
      new Map([
        ["a", 1],
        ["b", 2],
      ]),
    );
  });

  it("should overwrite target keys with source keys", () => {
    expect(
      mergeMaps(
        new Map([
          ["a", 1],
          ["b", 0],
        ]),
        new Map([["b", 2]]),
      ),
    ).toEqual(
      new Map([
        ["a", 1],
        ["b", 2],
      ]),
    );
  });

  it("should return source entries when target is undefined", () => {
    expect(mergeMaps(undefined, new Map([["b", 2]]))).toEqual(new Map([["b", 2]]));
  });
});

describe("mergeArrayMaps", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should concatenate arrays under matching keys", () => {
    expect(mergeArrayMaps(new Map([["a", [1]]]), new Map([["a", [2, 3]]]))).toEqual(
      new Map([["a", [1, 2, 3]]]),
    );
  });

  it("should keep keys present in only one map", () => {
    expect(mergeArrayMaps(new Map([["a", [1]]]), new Map([["b", [2]]]))).toEqual(
      new Map([
        ["a", [1]],
        ["b", [2]],
      ]),
    );
  });

  it("should return source entries when target is undefined", () => {
    expect(mergeArrayMaps(undefined, new Map([["b", [2]]]))).toEqual(new Map([["b", [2]]]));
  });
});
