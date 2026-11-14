import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { VersioningScheme } from "./types";

export type CounterVersion = {
  readonly value: number;
};

export const createVersioningScheme = defineObjectGenerator<VersioningScheme<CounterVersion>>(
  () => ({
    name: "counter",
    parse: (value) => (/^\d+$/.test(value) ? { value: Number.parseInt(value, 10) } : undefined),
    format: (version) => String(version.value),
    bumpRelease: (version) => ({ value: version.value + 1 }),
    isPrereleaseBaseStale: () => false,
  }),
);
