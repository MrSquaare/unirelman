import { describe, expect, it } from "vitest";

import { mergeArrayRecords, shallowMerge } from "./merge";

describe("shallowMerge", () => {
  it("should merge two objects", () => {
    expect(shallowMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("should overwrite target keys with source keys", () => {
    expect(shallowMerge({ a: 1, b: 0 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("should return source when target is undefined", () => {
    expect(shallowMerge(undefined, { b: 2 })).toEqual({ b: 2 });
  });
});

describe("mergeArrayRecords", () => {
  it("should concatenate arrays under matching keys", () => {
    expect(mergeArrayRecords({ a: [1] }, { a: [2, 3] })).toEqual({ a: [1, 2, 3] });
  });

  it("should keep keys present in only one record", () => {
    expect(mergeArrayRecords({ a: [1] }, { b: [2] })).toEqual({ a: [1], b: [2] });
  });

  it("should return source entries when target is undefined", () => {
    expect(mergeArrayRecords(undefined, { b: [2] })).toEqual({ b: [2] });
  });
});
