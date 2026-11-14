import { CHANGE_LEVELS, type ChangeLevel } from "@unirelman/core";

import type { ChangesetsChangeMeta } from "../types";

import { changesetsChangeMetaSchema } from "../types";

export const isChangesetsChangeMeta = (meta: unknown): meta is Required<ChangesetsChangeMeta> => {
  return changesetsChangeMetaSchema.safeParse(meta).success;
};

export const isChangeLevel = (value: string): value is ChangeLevel => {
  return CHANGE_LEVELS.some((level) => level === value);
};
