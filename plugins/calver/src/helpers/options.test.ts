import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveCalverPluginOptions } from "./options";

describe("resolveCalverPluginOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the given options", () => {
    expect(
      resolveCalverPluginOptions({
        prereleaseChannels: ["alpha"],
        fixed: true,
        granularity: "month",
      }),
    ).toEqual({ prereleaseChannels: ["alpha"], fixed: true, granularity: "month" });
  });

  it("should resolve default options", () => {
    expect(resolveCalverPluginOptions()).toEqual({
      prereleaseChannels: [],
      fixed: false,
      granularity: "day",
    });
  });
});
