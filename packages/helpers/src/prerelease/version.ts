import type { PrereleaseTag } from "./types";

export type ParsedPrereleaseVersion = {
  readonly version: string;
  readonly prerelease: PrereleaseTag | undefined;
};

const PRERELEASE_VERSION_RE = /^(.+?)(?:-([0-9A-Za-z-]+)\.(\d+))?$/;

export const parsePrereleaseVersion = (value: string): ParsedPrereleaseVersion => {
  const match = PRERELEASE_VERSION_RE.exec(value);

  if (!match) {
    return { version: value, prerelease: undefined };
  }

  const [, version, channel, increment] = match;

  if (channel === undefined || increment === undefined) {
    return { version, prerelease: undefined };
  }

  return {
    version,
    prerelease: {
      channel,
      increment: Number.parseInt(increment, 10),
    },
  };
};

export const formatPrereleaseVersion = (version: string, prerelease: PrereleaseTag): string => {
  return `${version}-${prerelease.channel}.${prerelease.increment}`;
};
