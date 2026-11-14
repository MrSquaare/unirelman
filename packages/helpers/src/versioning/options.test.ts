import { mockedResolvePrereleaseOptions } from "../prerelease/options.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveVersioningOptions } from "./options";

describe("resolveVersioningOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the prerelease options and the fixed option", () => {
    const options = { prereleaseChannels: ["alpha"], fixed: true };

    expect(resolveVersioningOptions(options)).toEqual({
      prereleaseChannels: ["alpha"],
      fixed: true,
    });
    expect(mockedResolvePrereleaseOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolvePrereleaseOptions).toHaveBeenNthCalledWith(1, options);
  });

  it("should resolve independent versioning by default", () => {
    expect(resolveVersioningOptions()).toEqual({
      prereleaseChannels: [],
      fixed: false,
    });
  });
});
