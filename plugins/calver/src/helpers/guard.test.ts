import { afterEach, describe, expect, it, vi } from "vitest";

import { createCalverVersionMeta } from "../types.fixture";
import { isCalverVersionMeta } from "./guard";

describe("isCalverVersionMeta", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when meta contains calver object", () => {
    const meta = createCalverVersionMeta();

    expect(isCalverVersionMeta(meta)).toEqual(true);
  });

  it("should return false when meta is null", () => {
    expect(isCalverVersionMeta(null)).toEqual(false);
  });

  it("should return false when meta is an empty object", () => {
    expect(isCalverVersionMeta({})).toEqual(false);
  });

  it("should return false when meta calver property is not an object", () => {
    expect(isCalverVersionMeta({ calver: "invalid" })).toEqual(false);
  });

  it("should return false when meta calver property is null", () => {
    expect(isCalverVersionMeta({ calver: null })).toEqual(false);
  });

  it("should return false when meta calver payload does not match schema", () => {
    expect(isCalverVersionMeta({ calver: { year: 2026, month: "10", day: 25, micro: 0 } })).toEqual(
      false,
    );
  });

  it.each([
    ["year", -1],
    ["year", 1.5],
    ["month", -1],
    ["month", 1.5],
    ["day", -1],
    ["day", 1.5],
    ["micro", -1],
    ["micro", 1.5],
  ])("should return false when the %s component is %s", (field, value) => {
    expect(
      isCalverVersionMeta({ calver: { year: 2026, month: 10, day: 25, micro: 0, [field]: value } }),
    ).toEqual(false);
  });

  it.each([-1, 1.5])("should return false when the prerelease increment is %s", (increment) => {
    expect(
      isCalverVersionMeta({
        calver: { year: 2026, month: 10, day: 25, micro: 0, channel: "beta", increment },
      }),
    ).toEqual(false);
  });
});
