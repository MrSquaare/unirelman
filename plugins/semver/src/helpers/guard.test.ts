import { afterEach, describe, expect, it, vi } from "vitest";

import { createSemverVersionMeta } from "../types.fixture";
import { isSemverVersionMeta } from "./guard";

describe("isSemverVersionMeta", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when meta contains semver object", () => {
    const meta = createSemverVersionMeta();

    expect(isSemverVersionMeta(meta)).toEqual(true);
  });

  it("should return false when meta is null", () => {
    expect(isSemverVersionMeta(null)).toEqual(false);
  });

  it("should return false when meta is an empty object", () => {
    expect(isSemverVersionMeta({})).toEqual(false);
  });

  it("should return false when meta semver property is not an object", () => {
    expect(isSemverVersionMeta({ semver: "invalid" })).toEqual(false);
  });

  it("should return false when meta has a null semver property", () => {
    expect(isSemverVersionMeta({ semver: null })).toEqual(false);
  });

  it("should return false when meta semver payload does not match schema", () => {
    expect(isSemverVersionMeta({ semver: { major: "1", minor: 0, patch: 0 } })).toEqual(false);
  });
});
