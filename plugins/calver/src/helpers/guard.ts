import type { CalverVersionMeta } from "../types";

import { calverVersionMetaSchema } from "../types";

export const isCalverVersionMeta = (meta: unknown): meta is Required<CalverVersionMeta> => {
  return calverVersionMetaSchema.safeParse(meta).success;
};
