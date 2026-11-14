import { afterEach, describe, expect, it, vi } from "vitest";

import { isChangeLevel, isChangesetsChangeMeta } from "./guard";

describe("isChangesetsChangeMeta", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when meta contains changesets object", () => {
    const meta = {
      changesets: {
        path: ".changeset/my-change.md",
      },
    };

    expect(isChangesetsChangeMeta(meta)).toEqual(true);
  });

  it("should return false when meta is null", () => {
    expect(isChangesetsChangeMeta(null)).toEqual(false);
  });

  it("should return false when meta is not an object", () => {
    expect(isChangesetsChangeMeta("string")).toEqual(false);
  });

  it("should return false when meta does not contain changesets property", () => {
    expect(isChangesetsChangeMeta({})).toEqual(false);
  });

  it("should return false when changesets property is null", () => {
    expect(isChangesetsChangeMeta({ changesets: null })).toEqual(false);
  });

  it("should return false when changesets property is not an object", () => {
    expect(isChangesetsChangeMeta({ changesets: "not-an-object" })).toEqual(false);
  });

  it("should return false when changesets payload does not match schema", () => {
    expect(isChangesetsChangeMeta({ changesets: { path: 1 } })).toEqual(false);
  });
});

describe("isChangeLevel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for a change level", () => {
    expect(isChangeLevel("minor")).toEqual(true);
  });

  it("should return false for any other value", () => {
    expect(isChangeLevel("huge")).toEqual(false);
  });
});
