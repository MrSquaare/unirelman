import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveSemverPluginOptions } from "./options";

describe("resolveSemverPluginOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the given options", () => {
    expect(resolveSemverPluginOptions({ prereleaseChannels: ["alpha"], fixed: true })).toEqual({
      prereleaseChannels: ["alpha"],
      fixed: true,
    });
  });

  it("should resolve default options", () => {
    expect(resolveSemverPluginOptions()).toEqual({ prereleaseChannels: [], fixed: false });
  });
});
