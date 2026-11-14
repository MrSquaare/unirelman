import type { ResolvedVersioningOptions, VersioningOptions } from "@unirelman/helpers/versioning";

import * as z from "zod";

export type CalverGranularity = "day" | "month";

export type CalverDate = {
  readonly year: number;
  readonly month: number;
  readonly day?: number;
};

const versionNumberSchema = z.number().int().nonnegative();

export const calverVersionSchema = z.strictObject({
  year: versionNumberSchema,
  month: versionNumberSchema,
  day: versionNumberSchema.optional(),
  micro: versionNumberSchema,
});

export type CalverVersion = z.infer<typeof calverVersionSchema>;

export const calverPreVersionSchema = calverVersionSchema.extend({
  channel: z.string(),
  increment: versionNumberSchema,
});

export type CalverPreVersion = z.infer<typeof calverPreVersionSchema>;

export type CalverPluginOptions = VersioningOptions & {
  readonly granularity?: CalverGranularity;
};

export type ResolvedCalverPluginOptions = ResolvedVersioningOptions & {
  readonly granularity: CalverGranularity;
};

export const calverVersionMetaSchema = z.object({
  calver: z.union([calverPreVersionSchema, calverVersionSchema]),
});

export type CalverVersionMeta = Partial<z.infer<typeof calverVersionMetaSchema>>;
