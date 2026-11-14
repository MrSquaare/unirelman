import * as z from "zod";

export type PrereleaseOptions = {
  readonly prereleaseChannels?: readonly string[];
};

export type ResolvedPrereleaseOptions = {
  readonly prereleaseChannels: readonly string[];
};

export type PrereleaseTransition =
  | { readonly kind: "exit"; readonly channel: string }
  | { readonly kind: "prerelease"; readonly channel: string }
  | { readonly kind: "release" };

export type PrereleaseChannelSelection =
  | { readonly action: "enter"; readonly channel: string }
  | { readonly action: "exit" };

export type PrereleaseTag = {
  readonly channel: string;
  readonly increment: number;
};

declare module "@unirelman/core" {
  interface VersionMeta {
    prerelease?: PrereleaseTag;
  }
}

export const prereleaseScopeStateSchema = z
  .object({
    channel: z.string(),
  })
  .readonly();

export const prereleaseStateSchema = z.record(z.string(), prereleaseScopeStateSchema).readonly();

export type PrereleaseScopeState = z.infer<typeof prereleaseScopeStateSchema>;

export type PrereleaseState = z.infer<typeof prereleaseStateSchema>;

export const prereleaseOutputSchema = z.object({
  group: z.string().nullable(),
  scopes: z.array(z.string()),
  channel: z.string().nullable(),
  previousChannel: z.string().nullable(),
});

export type PrereleaseOutput = z.infer<typeof prereleaseOutputSchema>;
