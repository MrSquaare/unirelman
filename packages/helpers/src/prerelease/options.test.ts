import { describe, expect, it } from "vitest";

import { resolvePrereleaseOptions } from "./options";

describe("resolvePrereleaseOptions", () => {
  it("should resolve options when custom prerelease channels are provided", () => {
    expect(
      resolvePrereleaseOptions({
        prereleaseChannels: ["alpha", "beta"],
      }),
    ).toEqual({
      prereleaseChannels: ["alpha", "beta"],
    });
  });

  it("should resolve options with defaults when no options are provided", () => {
    expect(resolvePrereleaseOptions()).toEqual({
      prereleaseChannels: [],
    });
  });
});
