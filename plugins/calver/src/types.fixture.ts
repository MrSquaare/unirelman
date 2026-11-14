import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { CalverVersion, CalverVersionMeta } from "./types";

export const createCalverVersion = defineObjectGenerator<CalverVersion>(() => ({
  year: 2026,
  month: 7,
  day: 24,
  micro: 0,
}));

export const createCalverVersionMeta = defineObjectGenerator<CalverVersionMeta>(() => ({
  calver: createCalverVersion(),
}));
