import type { MaybePromise } from "./common";
import type { PluginContext } from "./plugin";
import type { ScopeResultMap } from "./scope";

export interface ChangeMeta {}

export const CHANGE_LEVELS = ["patch", "minor", "major"] as const;

export type ChangeLevel = (typeof CHANGE_LEVELS)[number];

export type Change = {
  readonly message: string;
  readonly level: ChangeLevel;
  readonly meta: ChangeMeta;
};

export type ScopeChangesMap = ScopeResultMap<Change[]>;

export interface VersionMeta {}

export type Version = {
  readonly version: string;
  readonly meta: VersionMeta;
};

export type ScopeVersionMap = ScopeResultMap<Version>;

export type ScopeVersionMetaMap = ScopeResultMap<VersionMeta>;

export interface FileOperationMeta {}

export type FileOperationBase = {
  readonly type: string;
  readonly path: string;
  readonly meta: FileOperationMeta;
};

export type FileWrite = FileOperationBase & {
  readonly action: "write";
  readonly content: string;
};

export type FileDelete = FileOperationBase & {
  readonly action: "delete";
};

export type FileOperation = FileWrite | FileDelete;

export type ScopeFileOperationsMap = ScopeResultMap<FileOperation[]>;

export interface ReleaseMeta {}

export type ReleaseStatus = "created" | "existing";

export type Release = {
  readonly type: string;
  readonly name: string;
  readonly status: ReleaseStatus;
  readonly meta: ReleaseMeta;
};

export type ScopeReleasesMap = ScopeResultMap<Release[]>;

export type ScopeReleaseNotesMap = ScopeResultMap<string>;

export const PIPELINE_NAMES = ["version", "publish"] as const;

export type PipelineName = (typeof PIPELINE_NAMES)[number];

export const PHASE_NAMES = [
  "initialize",
  "getCurrentVersion",
  "parseCurrentVersion",
  "getChanges",
  "computeNextVersion",
  "getDependencyChanges",
  "generateFileOperations",
  "prepare",
  "getReleaseNotes",
  "createReleases",
  "finalize",
  "teardown",
] as const satisfies readonly (keyof PhaseMap)[];

export type PhaseName = (typeof PHASE_NAMES)[number];

export type PhaseContext = PluginContext & {
  readonly dryRun: boolean;
  readonly pipeline: PipelineName;
};

export type TeardownContext = PhaseContext & {
  readonly error?: unknown;
};

export type PhaseState = Record<string, ScopeResultMap>;

export type PhaseResult = unknown;

export type InitialState = {};

export type InitializeState = InitialState;

export type GetCurrentVersionState = InitialState;

export type GetChangesState = GetCurrentVersionState & {
  currentVersions: ScopeVersionMap;
};

export type ParseCurrentVersionState = GetChangesState;

export type ComputeNextVersionState = GetChangesState & {
  changes: ScopeChangesMap;
};

export type GetDependencyChangesState = ComputeNextVersionState & {
  nextVersions: ScopeVersionMap;
};

export type GenerateFileOperationsState = ComputeNextVersionState & {
  nextVersions: ScopeVersionMap;
};

export type PrepareState = GenerateFileOperationsState & {
  fileOperations: ScopeFileOperationsMap;
};

export type GetReleaseNotesState = GetChangesState;

export type CreateReleasesState = GetReleaseNotesState & {
  releaseNotes: ScopeReleaseNotesMap;
};

export type FinalizeState = CreateReleasesState & {
  releases: ScopeReleasesMap;
};

export type TeardownState = Partial<PrepareState & FinalizeState>;

export type PipelineResult =
  | (PrepareState & { readonly pipeline: "version"; readonly dryRun: boolean })
  | (FinalizeState & { readonly pipeline: "publish"; readonly dryRun: boolean });

export type PhaseFunctionDef<
  TContext extends PhaseContext,
  TState extends PhaseState,
  TResult extends PhaseResult,
> = (context: TContext, state: TState) => MaybePromise<TResult>;

export interface PhaseMap {
  initialize: PhaseFunctionDef<PhaseContext, InitializeState, void>;
  getChanges: PhaseFunctionDef<PhaseContext, GetChangesState, ScopeChangesMap>;
  getCurrentVersion: PhaseFunctionDef<PhaseContext, GetCurrentVersionState, ScopeVersionMap>;
  parseCurrentVersion: PhaseFunctionDef<
    PhaseContext,
    ParseCurrentVersionState,
    ScopeVersionMetaMap
  >;
  computeNextVersion: PhaseFunctionDef<PhaseContext, ComputeNextVersionState, ScopeVersionMap>;
  getDependencyChanges: PhaseFunctionDef<PhaseContext, GetDependencyChangesState, ScopeChangesMap>;
  generateFileOperations: PhaseFunctionDef<
    PhaseContext,
    GenerateFileOperationsState,
    ScopeFileOperationsMap
  >;
  prepare: PhaseFunctionDef<PhaseContext, PrepareState, void>;
  getReleaseNotes: PhaseFunctionDef<PhaseContext, GetReleaseNotesState, ScopeReleaseNotesMap>;
  createReleases: PhaseFunctionDef<PhaseContext, CreateReleasesState, ScopeReleasesMap>;
  finalize: PhaseFunctionDef<PhaseContext, FinalizeState, void>;
  teardown: PhaseFunctionDef<TeardownContext, TeardownState, void>;
}

export type PhaseFunctionContext<TName extends PhaseName> = Parameters<PhaseMap[TName]>[0];
export type PhaseFunctionState<TName extends PhaseName> = Parameters<PhaseMap[TName]>[1];
export type PhaseFunctionResult<TName extends PhaseName> = Awaited<ReturnType<PhaseMap[TName]>>;
export type PhaseFunction<TName extends PhaseName> = (
  context: PhaseFunctionContext<TName>,
  state: PhaseFunctionState<TName>,
) => MaybePromise<PhaseFunctionResult<TName>>;
