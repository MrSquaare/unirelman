import type { ReplacePluginOptions, ResolvedReplacePluginOptions } from "../types";

import { DEFAULT_REPLACE_ALLOW_NO_MATCH } from "../constants";

export const resolveReplacePluginOptions = (
  options: ReplacePluginOptions,
): ResolvedReplacePluginOptions => {
  return {
    files: options.files.map((file) => ({
      ...file,
      allowNoMatch: file.allowNoMatch ?? DEFAULT_REPLACE_ALLOW_NO_MATCH,
    })),
  };
};
