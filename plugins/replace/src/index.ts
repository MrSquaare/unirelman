import type { Plugin } from "@unirelman/core";

import type { ReplacePluginOptions } from "./types";

import { resolveReplacePluginOptions } from "./helpers/options";
import { createGenerateFileOperationsPhase } from "./phases/generate-file-operations";

export { ReplaceError, ReplaceNoMatchError, ReplaceUnknownScopeError } from "./errors";
export type { ReplaceFile, ReplaceInput, ReplacePluginOptions, ReplaceSearch } from "./types";

export const createReplacePlugin = (options: ReplacePluginOptions): Plugin => {
  const resolvedOptions = resolveReplacePluginOptions(options);

  return {
    name: "replace",
    generateFileOperations: createGenerateFileOperationsPhase(resolvedOptions),
  };
};
