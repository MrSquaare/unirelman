import type { PrereleaseScopeState, PrereleaseTransition } from "./types";

import {
  PrereleaseDowngradeChannelError,
  PrereleaseInvalidCurrentChannelError,
  PrereleaseInvalidTargetChannelError,
  PrereleaseNoChannelsConfiguredError,
} from "./errors";

export type ResolvePrereleaseTransitionParams = {
  readonly scopeState: PrereleaseScopeState | undefined;
  readonly currentChannel: string | undefined;
};

export const resolvePrereleaseTransition = (
  params: ResolvePrereleaseTransitionParams,
): PrereleaseTransition => {
  if (!params.scopeState && params.currentChannel) {
    return { kind: "exit", channel: params.currentChannel };
  }

  if (params.scopeState) {
    return { kind: "prerelease", channel: params.scopeState.channel };
  }

  return { kind: "release" };
};

export const assertPrereleaseChannelTransition = (
  currentChannel: string | undefined,
  targetChannel: string,
  channels: readonly string[],
): void => {
  if (channels.length === 0) {
    throw new PrereleaseNoChannelsConfiguredError();
  }

  const targetIndex = channels.indexOf(targetChannel);

  if (targetIndex === -1) {
    throw new PrereleaseInvalidTargetChannelError(targetChannel, channels);
  }

  if (!currentChannel) {
    return;
  }

  const currentIndex = channels.indexOf(currentChannel);

  if (currentIndex === -1) {
    throw new PrereleaseInvalidCurrentChannelError(currentChannel, channels);
  }

  if (targetIndex < currentIndex) {
    throw new PrereleaseDowngradeChannelError(currentChannel, targetChannel, channels);
  }
};
