import { mergeArrayRecords, runWithCleanup, shallowMerge } from "@unirelman/utils";
import { relative } from "node:path";

import type { ResolvedConfig } from "../types/config";
import type { CreateLogger, Logger } from "../types/logger";
import type {
  PhaseFunction,
  PhaseFunctionContext,
  PhaseFunctionResult,
  PhaseFunctionState,
  PhaseName,
  PipelineName,
  PipelineResult,
  PrepareState,
  FinalizeState,
  GetDependencyChangesState,
  ScopeChangesMap,
  ScopeFileOperationsMap,
  ScopeVersionMap,
  TeardownState,
} from "../types/phases";
import type { PluginContext } from "../types/plugin";

import { CorePhaseError, CoreTeardownError } from "../errors";
import { FS } from "../fs";
import {
  assertChangedScopeProviders,
  assertPhaseResultScopes,
  assertStableNextVersions,
  filterPhaseState,
  hasChanges,
  hasNewScopes,
  resolveCurrentVersions,
  resolveFileOperations,
  dedupeFileOperations,
} from "../helpers/phase";
import { createPluginContext } from "../helpers/plugin";

export type PipelineOptions = {
  readonly cwd: string;
  readonly config: ResolvedConfig;
  readonly createLogger: CreateLogger;
};

export type PipelineRunOptions = {
  readonly dryRun?: boolean;
};

type PipelineRun = {
  readonly pipeline: PipelineName;
  readonly dryRun: boolean;
};

type PhaseRun<TName extends PhaseName> = Omit<PhaseFunctionContext<TName>, keyof PluginContext>;

type PhaseResultMerger<TName extends PhaseName> = {
  readonly createEmpty: () => PhaseFunctionResult<TName>;
  readonly merge: (
    accumulatedResult: PhaseFunctionResult<TName>,
    result: PhaseFunctionResult<TName>,
  ) => PhaseFunctionResult<TName>;
};

const PHASE_RESULT_MERGERS: { readonly [TName in PhaseName]: PhaseResultMerger<TName> } = {
  initialize: { createEmpty: () => undefined, merge: () => undefined },
  getCurrentVersion: { createEmpty: () => ({}), merge: shallowMerge },
  parseCurrentVersion: { createEmpty: () => ({}), merge: shallowMerge },
  getChanges: { createEmpty: () => ({}), merge: mergeArrayRecords },
  computeNextVersion: { createEmpty: () => ({}), merge: shallowMerge },
  getDependencyChanges: { createEmpty: () => ({}), merge: mergeArrayRecords },
  generateFileOperations: { createEmpty: () => ({}), merge: mergeArrayRecords },
  prepare: { createEmpty: () => undefined, merge: () => undefined },
  getReleaseNotes: { createEmpty: () => ({}), merge: shallowMerge },
  createReleases: { createEmpty: () => ({}), merge: mergeArrayRecords },
  finalize: { createEmpty: () => undefined, merge: () => undefined },
  teardown: { createEmpty: () => undefined, merge: () => undefined },
};

export class Pipeline {
  private readonly logger: Logger;
  private readonly fs: FS;
  private readonly pluginContexts: Record<string, PluginContext> = {};

  constructor(private readonly options: PipelineOptions) {
    this.logger = options.createLogger("pipeline");
    this.fs = new FS(options.cwd);

    for (const pluginRegistration of options.config.plugins) {
      this.pluginContexts[pluginRegistration.plugin.name] = createPluginContext({
        pluginRegistration,
        cwd: options.cwd,
        scopes: this.options.config.scopes,
        createLogger: options.createLogger,
      });
    }
  }

  async run(pipeline: PipelineName, runOptions: PipelineRunOptions = {}): Promise<PipelineResult> {
    const run: PipelineRun = { pipeline, dryRun: runOptions.dryRun ?? false };
    const state: TeardownState = {};

    return runWithCleanup(
      () => this.executePipeline(run, state),
      (error) => this.executePhase("teardown", { ...run, error }, state),
    );
  }

  private async executePipeline(run: PipelineRun, state: TeardownState): Promise<PipelineResult> {
    await this.executePhase("initialize", run, {});

    if (run.pipeline === "version") {
      return { ...run, pipeline: "version", ...(await this.executeVersionPipeline(run, state)) };
    }

    return { ...run, pipeline: "publish", ...(await this.executePublishPipeline(run, state)) };
  }

  private async executeCurrentVersionPhases(run: PipelineRun): Promise<ScopeVersionMap> {
    const currentVersions = await this.executePhase("getCurrentVersion", run, {});
    const versionMetas = await this.executePhase("parseCurrentVersion", run, { currentVersions });

    return resolveCurrentVersions(currentVersions, versionMetas);
  }

  private async executeVersionPipeline(
    run: PipelineRun,
    state: TeardownState,
  ): Promise<PrepareState> {
    const currentVersions = await this.executeCurrentVersionPhases(run);

    state.currentVersions = currentVersions;

    const initialChanges = await this.executePhase("getChanges", run, { currentVersions });
    const initialNextVersions = await this.executeComputeNextVersionPhase(
      run,
      currentVersions,
      initialChanges,
    );
    const { changes, nextVersions } = await this.executeDependencyChangesPhases(
      run,
      currentVersions,
      initialChanges,
      initialNextVersions,
    );

    state.changes = changes;
    state.nextVersions = nextVersions;

    const fileOperations = resolveFileOperations(
      this.options.cwd,
      await this.executePhase("generateFileOperations", run, {
        currentVersions,
        changes,
        nextVersions,
      }),
    );

    state.fileOperations = fileOperations;

    await this.applyFileOperations(run, fileOperations);

    const prepareState = { currentVersions, changes, nextVersions, fileOperations };

    await this.executePhase("prepare", run, prepareState);

    return prepareState;
  }

  private async executeComputeNextVersionPhase(
    run: PipelineRun,
    currentVersions: ScopeVersionMap,
    changes: ScopeChangesMap,
  ): Promise<ScopeVersionMap> {
    assertChangedScopeProviders(this.options.config.plugins, changes);

    return this.executePhase("computeNextVersion", run, { currentVersions, changes });
  }

  private async executeDependencyChangesPhases(
    run: PipelineRun,
    currentVersions: ScopeVersionMap,
    initialChanges: ScopeChangesMap,
    nextVersions: ScopeVersionMap,
  ): Promise<GetDependencyChangesState> {
    const dependencyChanges = await this.executePhase("getDependencyChanges", run, {
      currentVersions,
      changes: initialChanges,
      nextVersions,
    });

    if (!hasChanges(dependencyChanges)) {
      return { currentVersions, changes: initialChanges, nextVersions };
    }

    const changes = mergeArrayRecords(initialChanges, dependencyChanges);
    const dependentNextVersions = await this.executeComputeNextVersionPhase(
      run,
      currentVersions,
      changes,
    );

    assertStableNextVersions(nextVersions, dependentNextVersions);

    if (!hasNewScopes(nextVersions, dependentNextVersions)) {
      return { currentVersions, changes, nextVersions: dependentNextVersions };
    }

    return this.executeDependencyChangesPhases(
      run,
      currentVersions,
      initialChanges,
      dependentNextVersions,
    );
  }

  private async executePublishPipeline(
    run: PipelineRun,
    state: TeardownState,
  ): Promise<FinalizeState> {
    const currentVersions = await this.executeCurrentVersionPhases(run);

    state.currentVersions = currentVersions;

    const releaseNotes = await this.executePhase("getReleaseNotes", run, { currentVersions });

    state.releaseNotes = releaseNotes;

    const releases = await this.executePhase("createReleases", run, {
      currentVersions,
      releaseNotes,
    });

    state.releases = releases;

    await this.executePhase("finalize", run, { currentVersions, releaseNotes, releases });

    return { currentVersions, releaseNotes, releases };
  }

  private async applyFileOperations(
    run: PipelineRun,
    fileOperations: ScopeFileOperationsMap,
  ): Promise<void> {
    for (const fileOperation of dedupeFileOperations(fileOperations)) {
      const displayPath = relative(this.options.cwd, fileOperation.path);

      if (run.dryRun) {
        this.logger.info(`Would ${fileOperation.action} ${displayPath}`);

        continue;
      }

      if (fileOperation.action === "delete") {
        await this.fs.delete(fileOperation.path);
        this.logger.info(`Deleted ${displayPath}`);

        continue;
      }

      await this.fs.write(fileOperation.path, fileOperation.content);
      this.logger.info(`Wrote ${displayPath}`);
    }
  }

  private async executePhase<TName extends PhaseName>(
    name: TName,
    run: PhaseRun<TName>,
    phaseState: PhaseFunctionState<TName>,
  ): Promise<PhaseFunctionResult<TName>> {
    const merger: PhaseResultMerger<TName> = PHASE_RESULT_MERGERS[name];
    const teardownErrors: CorePhaseError[] = [];
    let accumulatedResult = merger.createEmpty();

    this.logger.debug(`Starting ${name} phase`);

    for (const { plugin } of this.options.config.plugins) {
      const phaseFunction = plugin[name] as PhaseFunction<TName> | undefined;

      if (typeof phaseFunction !== "function") {
        continue;
      }

      const pluginContext = this.pluginContexts[plugin.name];
      const filteredScopeNames = new Set(Object.keys(pluginContext.scopes));

      if (filteredScopeNames.size === 0) {
        this.logger.debug(
          `Skipping ${name} phase for plugin ${plugin.name} because no scopes are enabled`,
        );

        continue;
      }

      const phaseContext = {
        ...pluginContext,
        ...run,
      };
      const filteredPhaseState = filterPhaseState(phaseState, filteredScopeNames);

      this.logger.debug(`Executing ${name} phase for plugin: ${plugin.name}`);

      let result: PhaseFunctionResult<TName>;

      try {
        result = await phaseFunction(phaseContext, filteredPhaseState);
      } catch (error) {
        const phaseError = new CorePhaseError(name, plugin.name, error);

        if (name !== "teardown") {
          throw phaseError;
        }

        teardownErrors.push(phaseError);

        continue;
      }

      assertPhaseResultScopes(name, plugin.name, result, filteredScopeNames);

      accumulatedResult = merger.merge(accumulatedResult, result);
    }

    if (teardownErrors.length === 1) {
      throw teardownErrors[0];
    }

    if (teardownErrors.length > 1) {
      throw new CoreTeardownError(teardownErrors);
    }

    this.logger.debug(`Finished ${name} phase`);

    return accumulatedResult;
  }
}
