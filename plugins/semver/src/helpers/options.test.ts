import { describe, expect, it } from "vitest";

import { resolveSemverPluginOptions } from "./options";

describe("resolveSemverPluginOptions", () => {
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
