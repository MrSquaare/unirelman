import type { ResolvedVersioningOptions, VersioningOptions } from "@unirelman/helpers/versioning";

import * as z from "zod";

export const semverVersionSchema = z.object({
  major: z.number(),
  minor: z.number(),
  patch: z.number(),
});

export type SemverVersion = z.infer<typeof semverVersionSchema>;

export const semverPreVersionSchema = semverVersionSchema.extend({
  channel: z.string(),
  increment: z.number(),
});

export type SemverPreVersion = z.infer<typeof semverPreVersionSchema>;

export type SemverPluginOptions = VersioningOptions;

export type ResolvedSemverPluginOptions = ResolvedVersioningOptions;

export const semverVersionMetaSchema = z.object({
  semver: z.union([semverPreVersionSchema, semverVersionSchema]),
});

export type SemverVersionMeta = Partial<z.infer<typeof semverVersionMetaSchema>>;
