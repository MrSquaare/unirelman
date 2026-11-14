import type { PrereleaseOptions, ResolvedPrereleaseOptions } from "./types";

import { DEFAULT_PRERELEASE_CHANNELS } from "./constants";

export const resolvePrereleaseOptions = (
  options: PrereleaseOptions = {},
): ResolvedPrereleaseOptions => {
  return {
    prereleaseChannels: options.prereleaseChannels ?? DEFAULT_PRERELEASE_CHANNELS,
  };
};
