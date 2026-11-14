import type { Change, Version } from "@unirelman/core";
import type { NonEmptyArray } from "@unirelman/utils";

import type { GroupRecord } from "../group/types";
import type {
  PrereleaseOptions,
  PrereleaseTag,
  ResolvedPrereleaseOptions,
} from "../prerelease/types";

export type VersioningFixed = boolean | GroupRecord;

export type VersioningOptions = PrereleaseOptions & {
  readonly fixed?: VersioningFixed;
};

export type ResolvedVersioningOptions = ResolvedPrereleaseOptions & {
  readonly fixed: VersioningFixed;
};

export interface VersioningScheme<TVersion extends object> {
  readonly name: string;
  parse(value: string): TVersion | undefined;
  format(version: TVersion): string;
  bumpRelease(version: TVersion, changes: NonEmptyArray<Change>): TVersion;
  isPrereleaseBaseStale(version: TVersion, changes: NonEmptyArray<Change>): boolean;
}

export type NextVersion = {
  readonly kind: "exit" | "prerelease" | "release";
  readonly version: Version;
};

export type ParsedVersion<TVersion extends object> = {
  readonly base: TVersion;
  readonly prerelease: PrereleaseTag | undefined;
};
