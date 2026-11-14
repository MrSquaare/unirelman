import * as z from "zod";

export const NPM_PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;

export type NpmPackageManager = (typeof NPM_PACKAGE_MANAGERS)[number];

export const dependencyMapSchema = z.record(z.string(), z.string());

export const packageJsonSchema = z.looseObject({
  name: z.string(),
  version: z.string(),
  private: z.boolean().optional(),
});

export type PackageJson = z.infer<typeof packageJsonSchema>;

export const packageJsonDocumentSchema = z.record(z.string(), z.unknown());

export type PackageJsonDocument = z.infer<typeof packageJsonDocumentSchema>;

export const publishPackageJsonSchema = packageJsonSchema.extend({
  scripts: z.record(z.string(), z.string()).optional(),
  dependencies: dependencyMapSchema.optional(),
  peerDependencies: dependencyMapSchema.optional(),
  optionalDependencies: dependencyMapSchema.optional(),
});

export type PublishPackageJson = z.infer<typeof publishPackageJsonSchema>;

export const NPM_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export type NpmDependencyField = (typeof NPM_DEPENDENCY_FIELDS)[number];

export const dependencyPackageJsonSchema = packageJsonSchema.extend({
  dependencies: dependencyMapSchema.optional(),
  devDependencies: dependencyMapSchema.optional(),
  peerDependencies: dependencyMapSchema.optional(),
  optionalDependencies: dependencyMapSchema.optional(),
});

export type DependencyPackageJson = z.infer<typeof dependencyPackageJsonSchema>;

export type ScopePackageJsonMap = Readonly<Record<string, DependencyPackageJson>>;

export type UpdatedInternalDependency = {
  readonly field: NpmDependencyField;
  readonly name: string;
  readonly specifier: string;
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly isOutOfRange: boolean;
};

export const packageManagerManifestSchema = z.looseObject({
  packageManager: z.string().optional(),
});

export type PackageManagerManifest = z.infer<typeof packageManagerManifestSchema>;

export type NpmInternalDependencyRanges = "patch" | "minor";

export type NpmInternalDependents = "out-of-range" | "always";

export type NpmUpdateInternalDependenciesOptions = {
  readonly ranges?: NpmInternalDependencyRanges;
  readonly dependents?: NpmInternalDependents;
};

export type ResolvedNpmUpdateInternalDependenciesOptions = {
  readonly ranges: NpmInternalDependencyRanges;
  readonly dependents: NpmInternalDependents;
};

export type NpmPluginOptions = {
  readonly publish?: boolean;
  readonly packageManager?: NpmPackageManager;
  readonly updateInternalDependencies?: NpmUpdateInternalDependenciesOptions;
};

export type ResolvedNpmPluginOptions = {
  readonly publish: boolean;
  readonly packageManager: NpmPackageManager | undefined;
  readonly updateInternalDependencies: ResolvedNpmUpdateInternalDependenciesOptions;
};
