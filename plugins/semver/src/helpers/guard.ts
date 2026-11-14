import type { SemverVersionMeta } from "../types";

import { semverVersionMetaSchema } from "../types";

export const isSemverVersionMeta = (meta: unknown): meta is Required<SemverVersionMeta> => {
  return semverVersionMetaSchema.safeParse(meta).success;
};
