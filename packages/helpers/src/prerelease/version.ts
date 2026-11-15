import type { PrereleaseTag } from "./types";

export type ParsedPrereleaseVersion = {
  readonly version: string;
  readonly prerelease: PrereleaseTag | undefined;
};

const CHANNEL_PROBE_VERSION = "0.0.0";

const CHANNEL_CHARACTER_RE = /^[0-9A-Za-z-]$/;
const INCREMENT_RE = /^\d+$/;

const resolveChannelCharactersStart = (value: string): number => {
  let start = value.length;

  while (start > 0 && CHANNEL_CHARACTER_RE.test(value.charAt(start - 1))) {
    start--;
  }

  return start;
};

export const parsePrereleaseVersion = (value: string): ParsedPrereleaseVersion => {
  const incrementSeparator = value.lastIndexOf(".");
  const increment = value.slice(incrementSeparator + 1);

  if (incrementSeparator === -1 || !INCREMENT_RE.test(increment)) {
    return { version: value, prerelease: undefined };
  }

  const head = value.slice(0, incrementSeparator);
  const channelSeparator = head.indexOf("-", Math.max(resolveChannelCharactersStart(head), 1));

  if (channelSeparator === -1 || channelSeparator === head.length - 1) {
    return { version: value, prerelease: undefined };
  }

  return {
    version: head.slice(0, channelSeparator),
    prerelease: {
      channel: head.slice(channelSeparator + 1),
      increment: Number.parseInt(increment, 10),
    },
  };
};

export const isValidPrereleaseChannel = (channel: string): boolean => {
  const { prerelease } = parsePrereleaseVersion(
    formatPrereleaseVersion(CHANNEL_PROBE_VERSION, { channel, increment: 0 }),
  );

  return prerelease?.channel === channel;
};

export const formatPrereleaseVersion = (version: string, prerelease: PrereleaseTag): string => {
  return `${version}-${prerelease.channel}.${prerelease.increment}`;
};
