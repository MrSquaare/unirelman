import type { CLIPlugin } from "@unirelman/cli";

import { createVersioningSchemePlugin } from "@unirelman/helpers/versioning";

import type { SemverPluginOptions, SemverVersionMeta } from "./types";

import { resolveSemverPluginOptions } from "./helpers/options";
import { semverScheme } from "./scheme";

export { isSemverVersionMeta } from "./helpers/guard";

export type {
  SemverPluginOptions,
  SemverPreVersion,
  SemverVersion,
  SemverVersionMeta,
} from "./types";

declare module "@unirelman/core" {
  interface VersionMeta extends SemverVersionMeta {}
}

export const createSemverPlugin = (options: SemverPluginOptions = {}): CLIPlugin => {
  return createVersioningSchemePlugin(semverScheme, resolveSemverPluginOptions(options));
};
