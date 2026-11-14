import { CHANGE_LEVELS, type ChangeLevel } from "@unirelman/core";
import * as z from "zod";

export type ParsedChangeset = {
  readonly scopes: readonly string[];
  readonly level: ChangeLevel;
  readonly message: string;
};

export const CHANGESET_FIELDS = ["scopes", "level", "message"] as const;

export type ChangesetField = (typeof CHANGESET_FIELDS)[number];

export const changesetSchema = z.object({
  path: z.string(),
});

export type Changeset = z.infer<typeof changesetSchema>;

export const changesetsChangeMetaSchema = z.object({
  changesets: changesetSchema,
});

export type ChangesetsChangeMeta = Partial<z.infer<typeof changesetsChangeMetaSchema>>;

export const changesetsCreateOutputSchema = z.object({
  path: z.string(),
  scopes: z.array(z.string()),
  level: z.enum(CHANGE_LEVELS),
  message: z.string(),
});

export type ChangesetsCreateOutput = z.infer<typeof changesetsCreateOutputSchema>;
