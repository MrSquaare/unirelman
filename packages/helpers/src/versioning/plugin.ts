import type { CLIPlugin } from "@unirelman/cli";

import type { VersioningOptions, VersioningScheme } from "./types";

import { createPrereleaseCommand } from "../prerelease/command";
import { resolveVersioningOptions } from "./options";
import { createComputeNextVersionPhase, createParseCurrentVersionPhase } from "./phase";

export const createVersioningSchemePlugin = <TVersion extends object>(
  scheme: VersioningScheme<TVersion>,
  options: VersioningOptions = {},
): CLIPlugin => {
  const resolvedOptions = resolveVersioningOptions(options);

  return {
    name: scheme.name,
    commandDescription: `Manage ${scheme.name} versions`,
    commands: (context) => ({
      pre: createPrereleaseCommand(context, resolvedOptions),
    }),
    parseCurrentVersion: createParseCurrentVersionPhase(scheme),
    computeNextVersion: createComputeNextVersionPhase(scheme, resolvedOptions),
  };
};
