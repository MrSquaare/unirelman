import * as z from "zod";

export const versionOutputScopeSchema = z.object({
  currentVersion: z.string().nullable(),
  nextVersion: z.string(),
});

export type VersionOutputScope = z.infer<typeof versionOutputScopeSchema>;

export const versionOutputFileSchema = z.object({
  path: z.string(),
  action: z.enum(["write", "delete"]),
});

export type VersionOutputFile = z.infer<typeof versionOutputFileSchema>;

export const versionOutputSchema = z.object({
  pipeline: z.literal("version"),
  dryRun: z.boolean(),
  scopes: z.record(z.string(), versionOutputScopeSchema),
  files: z.array(versionOutputFileSchema),
});

export type VersionOutput = z.infer<typeof versionOutputSchema>;

export const publishOutputReleaseSchema = z.object({
  type: z.string(),
  name: z.string(),
  status: z.enum(["created", "existing"]),
  meta: z.record(z.string(), z.unknown()),
});

export type PublishOutputRelease = z.infer<typeof publishOutputReleaseSchema>;

export const publishOutputSchema = z.object({
  pipeline: z.literal("publish"),
  dryRun: z.boolean(),
  releases: z.record(z.string(), z.array(publishOutputReleaseSchema)),
});

export type PublishOutput = z.infer<typeof publishOutputSchema>;

export const pipelineOutputSchema = z.discriminatedUnion("pipeline", [
  versionOutputSchema,
  publishOutputSchema,
]);

export type PipelineOutput = z.infer<typeof pipelineOutputSchema>;
