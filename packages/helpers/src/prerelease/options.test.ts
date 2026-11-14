import { describe, expect, it } from "vitest";

import { PrereleaseInvalidChannelNameError } from "./errors";
import { resolvePrereleaseOptions } from "./options";

describe("resolvePrereleaseOptions", () => {
  it("should resolve options when custom prerelease channels are provided", () => {
    expect(
      resolvePrereleaseOptions({
        prereleaseChannels: ["alpha", "release-candidate"],
      }),
    ).toEqual({
      prereleaseChannels: ["alpha", "release-candidate"],
    });
  });

  it("should resolve options with defaults when no options are provided", () => {
    expect(resolvePrereleaseOptions()).toEqual({
      prereleaseChannels: [],
    });
  });

  it("should throw when a channel contains a dot", () => {
    expect(() => resolvePrereleaseOptions({ prereleaseChannels: ["alpha", "rc.1"] })).toThrow(
      new PrereleaseInvalidChannelNameError("rc.1"),
    );
  });

  it("should throw when a channel is empty", () => {
    expect(() => resolvePrereleaseOptions({ prereleaseChannels: [""] })).toThrow(
      new PrereleaseInvalidChannelNameError(""),
    );
  });
});
