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

  it("should merge keys named after Object.prototype members", () => {
    expect(
      Object.entries(mergeArrayRecords({ constructor: [1] }, { constructor: [2], toString: [3] })),
    ).toEqual([
      ["constructor", [1, 2]],
      ["toString", [3]],
    ]);
  });

  it("should keep an own __proto__ key as data", () => {
    const target: Record<string, number[]> = JSON.parse('{"__proto__": [1]}');
    const source: Record<string, number[]> = JSON.parse('{"__proto__": [2]}');

    expect(Object.entries(mergeArrayRecords(target, source))).toEqual([["__proto__", [1, 2]]]);
  });
});
