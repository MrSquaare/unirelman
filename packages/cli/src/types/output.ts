import { createRecordMapSchema } from "@unirelman/utils";
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
  scopes: createRecordMapSchema(versionOutputScopeSchema),
  files: z.array(versionOutputFileSchema),
});

export type VersionOutput = z.input<typeof versionOutputSchema>;

export type ParsedVersionOutput = z.output<typeof versionOutputSchema>;

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
  releases: createRecordMapSchema(z.array(publishOutputReleaseSchema)),
});

export type PublishOutput = z.input<typeof publishOutputSchema>;

export type ParsedPublishOutput = z.output<typeof publishOutputSchema>;

export const pipelineOutputSchema = z.discriminatedUnion("pipeline", [
  versionOutputSchema,
  publishOutputSchema,
]);

export type PipelineOutput = z.input<typeof pipelineOutputSchema>;

export type ParsedPipelineOutput = z.output<typeof pipelineOutputSchema>;
