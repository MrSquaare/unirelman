import type { PrereleaseOptions, ResolvedPrereleaseOptions } from "./types";

import { DEFAULT_PRERELEASE_CHANNELS } from "./constants";
import { PrereleaseInvalidChannelNameError } from "./errors";
import { isValidPrereleaseChannel } from "./version";

export const resolvePrereleaseOptions = (
  options: PrereleaseOptions = {},
): ResolvedPrereleaseOptions => {
  const prereleaseChannels = options.prereleaseChannels ?? DEFAULT_PRERELEASE_CHANNELS;
  const invalidChannel = prereleaseChannels.find((channel) => !isValidPrereleaseChannel(channel));

  if (invalidChannel !== undefined) {
    throw new PrereleaseInvalidChannelNameError(invalidChannel);
  }

  return { prereleaseChannels };
};
