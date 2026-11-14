import type { ResolvedVersioningOptions, VersioningOptions } from "@unirelman/helpers/versioning";

import * as z from "zod";

const versionNumberSchema = z.number().int().nonnegative();

export const semverVersionSchema = z.strictObject({
  major: versionNumberSchema,
  minor: versionNumberSchema,
  patch: versionNumberSchema,
});

export type SemverVersion = z.infer<typeof semverVersionSchema>;

export const semverPreVersionSchema = semverVersionSchema.extend({
  channel: z.string(),
  increment: versionNumberSchema,
});

export type SemverPreVersion = z.infer<typeof semverPreVersionSchema>;

export type SemverPluginOptions = VersioningOptions;

export type ResolvedSemverPluginOptions = ResolvedVersioningOptions;

export const semverVersionMetaSchema = z.object({
  semver: z.union([semverPreVersionSchema, semverVersionSchema]),
});

export type SemverVersionMeta = Partial<z.infer<typeof semverVersionMetaSchema>>;
