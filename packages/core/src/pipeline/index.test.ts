import { MockedFS } from "../fs/index.mock";
import {
  mockedAssertChangedScopeProviders,
  mockedAssertPhaseResultScopes,
  mockedAssertStableNextVersions,
  mockedFilterPhaseState,
  mockedHasChanges,
  mockedHasNewScopes,
  mockedResolveCurrentVersions,
  mockedResolveFileOperations,
  mockedDedupeFileOperations,
} from "../helpers/phase.mock";
import { mockedCreatePluginContext } from "../helpers/plugin.mock";

import { CleanupError } from "@unirelman/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VersionMeta } from "../types/phases";

import { Pipeline } from ".";
import { CorePhaseError, CoreTeardownError } from "../errors";
import { CONFIG_CWD, createResolvedConfig } from "../testing/fixtures/config";
import {
  createChange,
  createFileDelete,
  createPrepareState,
  createCreateReleasesState,
  createFinalizeState,
  createScopeVersionMap,
  createVersion,
  createFileWrite,
} from "../testing/fixtures/phase";
import { createPluginContext, createPluginRegistration } from "../testing/fixtures/plugin";
import { SCOPE_NAMES, createScopeMap } from "../testing/fixtures/scope";
import { MockLogger, mockCreateLogger } from "../testing/mocks/logger";

describe("Pipeline", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize logger and plugin context instances with expected arguments", () => {
      const config = createResolvedConfig();

      new Pipeline({
        cwd: CONFIG_CWD,
        config: config,
        createLogger: mockCreateLogger,
      });

      expect(mockCreateLogger).toHaveBeenCalledTimes(1);
      expect(mockCreateLogger).toHaveBeenNthCalledWith(1, "pipeline");
      expect(MockedFS).toHaveBeenCalledTimes(1);
      expect(MockedFS).toHaveBeenNthCalledWith(1, CONFIG_CWD);

      expect(mockedCreatePluginContext).toHaveBeenCalledTimes(2);
      expect(mockedCreatePluginContext).toHaveBeenNthCalledWith(1, {
        pluginRegistration: config.plugins[0],
        cwd: CONFIG_CWD,
        scopes: config.scopes,
        createLogger: mockCreateLogger,
      });
      expect(mockedCreatePluginContext).toHaveBeenNthCalledWith(2, {
        pluginRegistration: config.plugins[1],
        cwd: CONFIG_CWD,
        scopes: config.scopes,
        createLogger: mockCreateLogger,
      });
    });
  });

  describe("run", () => {
    it("should execute the pipeline, then teardown without error", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePipelineSpy = vi.spyOn(pipeline as any, "executePipeline");
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const result = { pipeline: "version", dryRun: false, ...createPrepareState() };

      executePipelineSpy.mockResolvedValueOnce(result);
      executePhaseSpy.mockResolvedValueOnce(undefined);

      await expect(pipeline.run("version")).resolves.toEqual(result);

      expect(executePipelineSpy).toHaveBeenCalledTimes(1);
      expect(executePipelineSpy).toHaveBeenNthCalledWith(
        1,
        { pipeline: "version", dryRun: false },
        {},
      );
      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(
        1,
        "teardown",
        { pipeline: "version", dryRun: false, error: undefined },
        {},
      );
    });

    it("should pass dryRun to the pipeline run", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePipelineSpy = vi.spyOn(pipeline as any, "executePipeline");
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const result = { pipeline: "publish", dryRun: true, ...createFinalizeState() };

      executePipelineSpy.mockResolvedValueOnce(result);
      executePhaseSpy.mockResolvedValueOnce(undefined);

      await expect(pipeline.run("publish", { dryRun: true })).resolves.toEqual(result);

      expect(executePipelineSpy).toHaveBeenCalledTimes(1);
      expect(executePipelineSpy).toHaveBeenNthCalledWith(
        1,
        { pipeline: "publish", dryRun: true },
        {},
      );
      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(
        1,
        "teardown",
        { pipeline: "publish", dryRun: true, error: undefined },
        {},
      );
    });

    it("should execute teardown with the error and the partial state when the pipeline fails", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePipelineSpy = vi.spyOn(pipeline as any, "executePipeline");
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const currentVersions = { [SCOPE_NAMES.ALPHA]: createVersion() };
      const error = new Error("getChanges failed");

      executePipelineSpy.mockImplementationOnce(async (_run, state) => {
        Object.assign(state as object, { currentVersions });

        throw error;
      });
      executePhaseSpy.mockResolvedValueOnce(undefined);

      await expect(pipeline.run("version")).rejects.toThrow(new Error("getChanges failed"));

      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(
        1,
        "teardown",
        { pipeline: "version", dryRun: false, error },
        { currentVersions },
      );
    });

    it("should throw both errors when teardown fails after a pipeline failure", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePipelineSpy = vi.spyOn(pipeline as any, "executePipeline");
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const error = new Error("getChanges failed");
      const teardownError = new Error("teardown failed");

      executePipelineSpy.mockRejectedValueOnce(error);
      executePhaseSpy.mockRejectedValueOnce(teardownError);

      await expect(pipeline.run("version")).rejects.toThrow(new CleanupError(error, teardownError));
    });
  });

  describe("executePipeline", () => {
    it("should run the version pipeline after initialize", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const executeVersionPipelineSpy = vi.spyOn(pipeline as any, "executeVersionPipeline");
      const executePublishPipelineSpy = vi.spyOn(pipeline as any, "executePublishPipeline");
      const prepareState = createPrepareState();
      const state = {};

      executePhaseSpy.mockResolvedValueOnce(undefined);
      executeVersionPipelineSpy.mockResolvedValueOnce(prepareState);

      await expect(
        pipeline["executePipeline"]({ pipeline: "version", dryRun: false }, state),
      ).resolves.toEqual({ pipeline: "version", dryRun: false, ...prepareState });

      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(
        1,
        "initialize",
        { pipeline: "version", dryRun: false },
        {},
      );
      expect(executeVersionPipelineSpy).toHaveBeenCalledTimes(1);
      expect(executeVersionPipelineSpy).toHaveBeenNthCalledWith(
        1,
        { pipeline: "version", dryRun: false },
        state,
      );
      expect(executePublishPipelineSpy).not.toHaveBeenCalled();
    });

    it("should run the publish pipeline after initialize", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const executeVersionPipelineSpy = vi.spyOn(pipeline as any, "executeVersionPipeline");
      const executePublishPipelineSpy = vi.spyOn(pipeline as any, "executePublishPipeline");
      const finalizeState = createFinalizeState();
      const state = {};

      executePhaseSpy.mockResolvedValueOnce(undefined);
      executePublishPipelineSpy.mockResolvedValueOnce(finalizeState);

      await expect(
        pipeline["executePipeline"]({ pipeline: "publish", dryRun: true }, state),
      ).resolves.toEqual({ pipeline: "publish", dryRun: true, ...finalizeState });

      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(
        1,
        "initialize",
        { pipeline: "publish", dryRun: true },
        {},
      );
      expect(executeVersionPipelineSpy).not.toHaveBeenCalled();
      expect(executePublishPipelineSpy).toHaveBeenCalledTimes(1);
      expect(executePublishPipelineSpy).toHaveBeenNthCalledWith(
        1,
        { pipeline: "publish", dryRun: true },
        state,
      );
    });
  });

  describe("executeCurrentVersionPhases", () => {
    it("should get current versions, then parse them and merge their meta", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const run = { pipeline: "publish", dryRun: false } as const;
      const currentVersions = {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0-alpha.0", meta: {} } }),
      };
      const versionMetas = {
        [SCOPE_NAMES.ALPHA]: { prerelease: { channel: "alpha", increment: 0 } } as VersionMeta,
      };

      executePhaseSpy.mockResolvedValueOnce(currentVersions).mockResolvedValueOnce(versionMetas);

      await expect(pipeline["executeCurrentVersionPhases"](run)).resolves.toEqual({
        [SCOPE_NAMES.ALPHA]: {
          version: "1.1.0-alpha.0",
          meta: { prerelease: { channel: "alpha", increment: 0 } },
        },
      });
      expect(executePhaseSpy).toHaveBeenCalledTimes(2);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "getCurrentVersion", run, {});
      expect(executePhaseSpy).toHaveBeenNthCalledWith(2, "parseCurrentVersion", run, {
        currentVersions,
      });
      expect(mockedResolveCurrentVersions).toHaveBeenCalledTimes(1);
      expect(mockedResolveCurrentVersions).toHaveBeenNthCalledWith(
        1,
        currentVersions,
        versionMetas,
      );
    });
  });

  describe("executeVersionPipeline", () => {
    it("should execute version phases in order with accumulated state", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executeCurrentVersionPhasesSpy = vi.spyOn(
        pipeline as any,
        "executeCurrentVersionPhases",
      );
      const executeComputeNextVersionPhaseSpy = vi.spyOn(
        pipeline as any,
        "executeComputeNextVersionPhase",
      );
      const executeDependencyChangesPhasesSpy = vi.spyOn(
        pipeline as any,
        "executeDependencyChangesPhases",
      );
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const applyFileOperationsSpy = vi.spyOn(pipeline as any, "applyFileOperations");
      const run = { pipeline: "version", dryRun: false } as const;
      const { currentVersions, changes, nextVersions, fileOperations } = createPrepareState();
      const initialChanges = { [SCOPE_NAMES.ALPHA]: [createChange()] };
      const initialNextVersions = { [SCOPE_NAMES.ALPHA]: createVersion() };
      const state = {};

      executeCurrentVersionPhasesSpy.mockResolvedValueOnce(currentVersions);
      executePhaseSpy
        .mockResolvedValueOnce(initialChanges)
        .mockResolvedValueOnce(fileOperations)
        .mockResolvedValueOnce(undefined);
      executeComputeNextVersionPhaseSpy.mockResolvedValueOnce(initialNextVersions);
      executeDependencyChangesPhasesSpy.mockResolvedValueOnce({
        currentVersions,
        changes,
        nextVersions,
      });
      applyFileOperationsSpy.mockResolvedValueOnce(undefined);

      await expect(pipeline["executeVersionPipeline"](run, state)).resolves.toEqual({
        currentVersions,
        changes,
        nextVersions,
        fileOperations,
      });

      expect(executeCurrentVersionPhasesSpy).toHaveBeenCalledTimes(1);
      expect(executeCurrentVersionPhasesSpy).toHaveBeenNthCalledWith(1, run);
      expect(executePhaseSpy).toHaveBeenCalledTimes(3);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "getChanges", run, { currentVersions });
      expect(executeComputeNextVersionPhaseSpy).toHaveBeenCalledTimes(1);
      expect(executeComputeNextVersionPhaseSpy).toHaveBeenNthCalledWith(
        1,
        run,
        currentVersions,
        initialChanges,
      );
      expect(executeDependencyChangesPhasesSpy).toHaveBeenCalledTimes(1);
      expect(executeDependencyChangesPhasesSpy).toHaveBeenNthCalledWith(
        1,
        run,
        currentVersions,
        initialChanges,
        initialNextVersions,
      );
      expect(executePhaseSpy).toHaveBeenNthCalledWith(2, "generateFileOperations", run, {
        currentVersions,
        changes,
        nextVersions,
      });
      expect(mockedResolveFileOperations).toHaveBeenCalledTimes(1);
      expect(mockedResolveFileOperations).toHaveBeenNthCalledWith(1, CONFIG_CWD, fileOperations);
      expect(applyFileOperationsSpy).toHaveBeenCalledTimes(1);
      expect(applyFileOperationsSpy).toHaveBeenNthCalledWith(1, run, fileOperations);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(3, "prepare", run, {
        currentVersions,
        changes,
        nextVersions,
        fileOperations,
      });
      expect(state).toEqual({ currentVersions, changes, nextVersions, fileOperations });
    });
  });

  describe("executeComputeNextVersionPhase", () => {
    it("should check the providers of the changed scopes, then compute next versions", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const run = { pipeline: "version", dryRun: false } as const;
      const { currentVersions, changes, nextVersions } = createPrepareState();

      executePhaseSpy.mockResolvedValueOnce(nextVersions);

      await expect(
        pipeline["executeComputeNextVersionPhase"](run, currentVersions, changes),
      ).resolves.toEqual(nextVersions);

      expect(mockedAssertChangedScopeProviders).toHaveBeenCalledTimes(1);
      expect(mockedAssertChangedScopeProviders).toHaveBeenNthCalledWith(
        1,
        pipeline["options"].config.plugins,
        changes,
      );
      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "computeNextVersion", run, {
        currentVersions,
        changes,
      });
    });
  });

  describe("executeDependencyChangesPhases", () => {
    it("should keep the initial changes when no dependency change appears", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const executeComputeNextVersionPhaseSpy = vi.spyOn(
        pipeline as any,
        "executeComputeNextVersionPhase",
      );
      const run = { pipeline: "version", dryRun: false } as const;
      const { currentVersions, changes, nextVersions } = createPrepareState();

      executePhaseSpy.mockResolvedValueOnce({});

      await expect(
        pipeline["executeDependencyChangesPhases"](run, currentVersions, changes, nextVersions),
      ).resolves.toEqual({ currentVersions, changes, nextVersions });

      expect(executePhaseSpy).toHaveBeenCalledTimes(1);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "getDependencyChanges", run, {
        currentVersions,
        changes,
        nextVersions,
      });
      expect(mockedHasChanges).toHaveBeenCalledTimes(1);
      expect(mockedHasChanges).toHaveBeenNthCalledWith(1, {});
      expect(executeComputeNextVersionPhaseSpy).not.toHaveBeenCalled();
      expect(mockedAssertStableNextVersions).not.toHaveBeenCalled();
    });

    it("should return the dependency changes when they give no new next version", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const executeComputeNextVersionPhaseSpy = vi.spyOn(
        pipeline as any,
        "executeComputeNextVersionPhase",
      );
      const run = { pipeline: "version", dryRun: false } as const;
      const currentVersions = createScopeVersionMap();
      const alphaChange = createChange({ extends: { message: "fix alpha" } });
      const dependencyChange = createChange({ extends: { message: "Updated dependencies" } });
      const initialChanges = { [SCOPE_NAMES.ALPHA]: [alphaChange] };
      const nextVersions = { [SCOPE_NAMES.ALPHA]: createVersion() };
      const dependencyChanges = { [SCOPE_NAMES.ALPHA]: [dependencyChange] };
      const changes = { [SCOPE_NAMES.ALPHA]: [alphaChange, dependencyChange] };
      const dependentNextVersions = { [SCOPE_NAMES.ALPHA]: createVersion() };

      executePhaseSpy.mockResolvedValueOnce(dependencyChanges);
      executeComputeNextVersionPhaseSpy.mockResolvedValueOnce(dependentNextVersions);

      await expect(
        pipeline["executeDependencyChangesPhases"](
          run,
          currentVersions,
          initialChanges,
          nextVersions,
        ),
      ).resolves.toEqual({ currentVersions, changes, nextVersions: dependentNextVersions });

      expect(executeComputeNextVersionPhaseSpy).toHaveBeenCalledTimes(1);
      expect(executeComputeNextVersionPhaseSpy).toHaveBeenNthCalledWith(
        1,
        run,
        currentVersions,
        changes,
      );
      expect(mockedAssertStableNextVersions).toHaveBeenCalledTimes(1);
      expect(mockedAssertStableNextVersions).toHaveBeenNthCalledWith(
        1,
        nextVersions,
        dependentNextVersions,
      );
      expect(mockedHasNewScopes).toHaveBeenCalledTimes(1);
      expect(mockedHasNewScopes).toHaveBeenNthCalledWith(1, nextVersions, dependentNextVersions);
    });

    it("should resolve dependency changes again from the initial changes when new next versions appear", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const executeComputeNextVersionPhaseSpy = vi.spyOn(
        pipeline as any,
        "executeComputeNextVersionPhase",
      );
      const run = { pipeline: "version", dryRun: false } as const;
      const currentVersions = createScopeVersionMap();
      const alphaChange = createChange({ extends: { message: "fix alpha" } });
      const dependencyChange = createChange({ extends: { message: "Updated dependencies" } });
      const initialChanges = { [SCOPE_NAMES.ALPHA]: [alphaChange] };
      const nextVersions = { [SCOPE_NAMES.ALPHA]: createVersion() };
      const dependencyChanges = { [SCOPE_NAMES.BETA]: [dependencyChange] };
      const changes = {
        [SCOPE_NAMES.ALPHA]: [alphaChange],
        [SCOPE_NAMES.BETA]: [dependencyChange],
      };
      const dependentNextVersions = createScopeVersionMap();

      executePhaseSpy
        .mockResolvedValueOnce(dependencyChanges)
        .mockResolvedValueOnce(dependencyChanges);
      executeComputeNextVersionPhaseSpy
        .mockResolvedValueOnce(dependentNextVersions)
        .mockResolvedValueOnce(dependentNextVersions);

      await expect(
        pipeline["executeDependencyChangesPhases"](
          run,
          currentVersions,
          initialChanges,
          nextVersions,
        ),
      ).resolves.toEqual({ currentVersions, changes, nextVersions: dependentNextVersions });

      expect(executePhaseSpy).toHaveBeenCalledTimes(2);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "getDependencyChanges", run, {
        currentVersions,
        changes: initialChanges,
        nextVersions,
      });
      expect(executePhaseSpy).toHaveBeenNthCalledWith(2, "getDependencyChanges", run, {
        currentVersions,
        changes: initialChanges,
        nextVersions: dependentNextVersions,
      });
      expect(mockedHasNewScopes).toHaveBeenCalledTimes(2);
      expect(mockedHasNewScopes).toHaveBeenNthCalledWith(1, nextVersions, dependentNextVersions);
      expect(mockedHasNewScopes).toHaveBeenNthCalledWith(
        2,
        dependentNextVersions,
        dependentNextVersions,
      );
    });
  });

  describe("executePublishPipeline", () => {
    it("should resolve current versions, get release notes, create releases, then finalize and return the releases", async () => {
      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const executeCurrentVersionPhasesSpy = vi.spyOn(
        pipeline as any,
        "executeCurrentVersionPhases",
      );
      const executePhaseSpy = vi.spyOn(pipeline as any, "executePhase");
      const run = { pipeline: "publish", dryRun: false } as const;
      const { currentVersions, releaseNotes, releases } = createFinalizeState();
      const state = {};

      executeCurrentVersionPhasesSpy.mockResolvedValueOnce(currentVersions);
      executePhaseSpy
        .mockResolvedValueOnce(releaseNotes)
        .mockResolvedValueOnce(releases)
        .mockResolvedValueOnce(undefined);

      await expect(pipeline["executePublishPipeline"](run, state)).resolves.toEqual({
        currentVersions,
        releaseNotes,
        releases,
      });

      expect(executeCurrentVersionPhasesSpy).toHaveBeenCalledTimes(1);
      expect(executeCurrentVersionPhasesSpy).toHaveBeenNthCalledWith(1, run);
      expect(executePhaseSpy).toHaveBeenCalledTimes(3);
      expect(executePhaseSpy).toHaveBeenNthCalledWith(1, "getReleaseNotes", run, {
        currentVersions,
      });
      expect(executePhaseSpy).toHaveBeenNthCalledWith(2, "createReleases", run, {
        currentVersions,
        releaseNotes,
      });
      expect(executePhaseSpy).toHaveBeenNthCalledWith(3, "finalize", run, {
        currentVersions,
        releaseNotes,
        releases,
      });
      expect(mockedAssertChangedScopeProviders).not.toHaveBeenCalled();
      expect(state).toEqual({ currentVersions, releaseNotes, releases });
    });
  });

  describe("applyFileOperations", () => {
    it("should apply write and delete file operations", async () => {
      const logger = new MockLogger();

      mockCreateLogger.mockReturnValueOnce(logger);

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const fs = vi.mocked(MockedFS.mock.instances[0]);
      const changelogContent = createFileWrite({
        extends: { path: "/repo/CHANGELOG.md", content: "# Changelog\n" },
      });
      const changesetContent = createFileDelete({
        extends: { path: "/repo/.unirelman/changesets/a.md" },
      });
      const fileOperations = { [SCOPE_NAMES.ALPHA]: [changelogContent, changesetContent] };

      await expect(
        pipeline["applyFileOperations"]({ pipeline: "version", dryRun: false }, fileOperations),
      ).resolves.toEqual(undefined);

      expect(mockedDedupeFileOperations).toHaveBeenCalledTimes(1);
      expect(mockedDedupeFileOperations).toHaveBeenNthCalledWith(1, fileOperations);
      expect(fs.write).toHaveBeenCalledTimes(1);
      expect(fs.write).toHaveBeenNthCalledWith(1, "/repo/CHANGELOG.md", "# Changelog\n");
      expect(fs.delete).toHaveBeenCalledTimes(1);
      expect(fs.delete).toHaveBeenNthCalledWith(1, "/repo/.unirelman/changesets/a.md");
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenNthCalledWith(1, "Wrote CHANGELOG.md");
      expect(logger.info).toHaveBeenNthCalledWith(2, "Deleted .unirelman/changesets/a.md");
    });

    it("should only log file operations in dry-run mode", async () => {
      const logger = new MockLogger();

      mockCreateLogger.mockReturnValueOnce(logger);

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig(),
        createLogger: mockCreateLogger,
      });
      const fs = vi.mocked(MockedFS.mock.instances[0]);
      const fileOperations = {
        [SCOPE_NAMES.ALPHA]: [
          createFileWrite({ extends: { path: "/repo/CHANGELOG.md" } }),
          createFileDelete({ extends: { path: "/repo/.unirelman/changesets/a.md" } }),
        ],
      };

      await expect(
        pipeline["applyFileOperations"]({ pipeline: "version", dryRun: true }, fileOperations),
      ).resolves.toEqual(undefined);

      expect(fs.write).not.toHaveBeenCalled();
      expect(fs.delete).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenNthCalledWith(1, "Would write CHANGELOG.md");
      expect(logger.info).toHaveBeenNthCalledWith(2, "Would delete .unirelman/changesets/a.md");
    });
  });

  describe("executePhase", () => {
    it("should execute phase", async () => {
      const logger = new MockLogger();

      mockCreateLogger.mockReturnValueOnce(logger);

      const firstChange = createChange({ extends: { message: "First change" } });
      const secondChange = createChange({ extends: { message: "Second change" } });
      const getChangesA = vi.fn().mockResolvedValueOnce({ [SCOPE_NAMES.ALPHA]: [firstChange] });
      const pluginWithGetChangesA = createPluginRegistration({
        extends: {
          plugin: {
            name: "plugin-with-get-changes-a",
            getChanges: getChangesA,
          },
        },
      });
      const getChangesB = vi.fn().mockResolvedValueOnce({ [SCOPE_NAMES.ALPHA]: [secondChange] });
      const pluginWithGetChangesB = createPluginRegistration({
        extends: {
          plugin: {
            name: "plugin-with-get-changes-b",
            getChanges: getChangesB,
          },
        },
      });

      const filteredScopes = createScopeMap();
      const pluginContextA = createPluginContext({
        scopes: filteredScopes,
      });
      const pluginContextB = createPluginContext({
        scopes: filteredScopes,
      });

      mockedCreatePluginContext
        .mockReturnValueOnce(pluginContextA)
        .mockReturnValueOnce(pluginContextB);

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({
          extends: { plugins: [pluginWithGetChangesA, pluginWithGetChangesB] },
        }),
        createLogger: mockCreateLogger,
      });

      const completeState = createPrepareState();

      mockedFilterPhaseState.mockReturnValueOnce(completeState).mockReturnValueOnce(completeState);

      await expect(
        pipeline["executePhase"](
          "getChanges",
          { pipeline: "version", dryRun: false },
          completeState,
        ),
      ).resolves.toEqual({ [SCOPE_NAMES.ALPHA]: [firstChange, secondChange] });

      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(4);
      expect(logger.debug).toHaveBeenNthCalledWith(1, "Starting getChanges phase");
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        "Executing getChanges phase for plugin: plugin-with-get-changes-a",
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        3,
        "Executing getChanges phase for plugin: plugin-with-get-changes-b",
      );
      expect(logger.debug).toHaveBeenNthCalledWith(4, "Finished getChanges phase");

      expect(mockedFilterPhaseState).toHaveBeenCalledTimes(2);
      expect(mockedFilterPhaseState).toHaveBeenNthCalledWith(
        1,
        completeState,
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
      expect(mockedFilterPhaseState).toHaveBeenNthCalledWith(
        2,
        completeState,
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
      expect(getChangesA).toHaveBeenCalledTimes(1);
      expect(getChangesA).toHaveBeenNthCalledWith(
        1,
        {
          ...pluginContextA,
          dryRun: false,
          pipeline: "version",
        },
        completeState,
      );
      expect(getChangesB).toHaveBeenCalledTimes(1);
      expect(getChangesB).toHaveBeenNthCalledWith(
        1,
        {
          ...pluginContextB,
          dryRun: false,
          pipeline: "version",
        },
        completeState,
      );
      expect(mockedAssertPhaseResultScopes).toHaveBeenCalledTimes(2);
      expect(mockedAssertPhaseResultScopes).toHaveBeenNthCalledWith(
        1,
        "getChanges",
        "plugin-with-get-changes-a",
        { [SCOPE_NAMES.ALPHA]: [firstChange] },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
      expect(mockedAssertPhaseResultScopes).toHaveBeenNthCalledWith(
        2,
        "getChanges",
        "plugin-with-get-changes-b",
        { [SCOPE_NAMES.ALPHA]: [secondChange] },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
    });

    it("should skip plugins without matching phase function", async () => {
      const logger = new MockLogger();

      mockCreateLogger.mockReturnValueOnce(logger);

      const pluginWithoutGetChanges = createPluginRegistration({
        extends: {
          plugin: {
            name: "plugin-no-get-changes",
          },
        },
      });
      const change = createChange();
      const getChanges = vi.fn().mockResolvedValueOnce({ [SCOPE_NAMES.ALPHA]: [change] });
      const pluginWithGetChanges = createPluginRegistration({
        extends: {
          plugin: {
            name: "plugin-with-get-changes",
            getChanges,
          },
        },
      });

      const pluginContextWithoutGetChanges = createPluginContext();
      const pluginContextWithGetChanges = createPluginContext();

      mockedCreatePluginContext
        .mockReturnValueOnce(pluginContextWithoutGetChanges)
        .mockReturnValueOnce(pluginContextWithGetChanges);

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({
          extends: { plugins: [pluginWithoutGetChanges, pluginWithGetChanges] },
        }),
        createLogger: mockCreateLogger,
      });

      const completeState = createPrepareState();

      mockedFilterPhaseState.mockReturnValueOnce(completeState);

      await expect(
        pipeline["executePhase"](
          "getChanges",
          { pipeline: "version", dryRun: false },
          completeState,
        ),
      ).resolves.toEqual({ [SCOPE_NAMES.ALPHA]: [change] });

      expect(logger.info).not.toHaveBeenCalled();

      expect(logger.debug).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenNthCalledWith(1, "Starting getChanges phase");
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        "Executing getChanges phase for plugin: plugin-with-get-changes",
      );
      expect(logger.debug).toHaveBeenNthCalledWith(3, "Finished getChanges phase");

      expect(mockedFilterPhaseState).toHaveBeenCalledTimes(1);
      expect(mockedFilterPhaseState).toHaveBeenNthCalledWith(
        1,
        completeState,
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
      expect(getChanges).toHaveBeenCalledTimes(1);
      expect(getChanges).toHaveBeenNthCalledWith(
        1,
        {
          ...pluginContextWithGetChanges,
          dryRun: false,
          pipeline: "version",
        },
        completeState,
      );
      expect(mockedAssertPhaseResultScopes).toHaveBeenCalledTimes(1);
      expect(mockedAssertPhaseResultScopes).toHaveBeenNthCalledWith(
        1,
        "getChanges",
        "plugin-with-get-changes",
        { [SCOPE_NAMES.ALPHA]: [change] },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
    });

    it.each([
      "getCurrentVersion",
      "parseCurrentVersion",
      "getChanges",
      "computeNextVersion",
      "getDependencyChanges",
      "generateFileOperations",
      "getReleaseNotes",
      "createReleases",
    ] as const)(
      "should return a new empty result on each %s run when no plugin provides the phase",
      async (phaseName) => {
        const pipeline = new Pipeline({
          cwd: CONFIG_CWD,
          config: createResolvedConfig({ extends: { plugins: [] } }),
          createLogger: mockCreateLogger,
        });
        const run = { pipeline: "version", dryRun: false } as const;

        const firstResult = await pipeline["executePhase"](phaseName, run, createPrepareState());
        const secondResult = await pipeline["executePhase"](phaseName, run, createPrepareState());

        expect(firstResult).toEqual({});
        expect(secondResult).toEqual({});
        expect(secondResult).not.toBe(firstResult);
        expect(mockedAssertPhaseResultScopes).not.toHaveBeenCalled();
      },
    );

    it("should skip plugin when no scope name is selected", async () => {
      const logger = new MockLogger();

      mockCreateLogger.mockReturnValueOnce(logger);

      const getChanges = vi.fn().mockResolvedValueOnce({
        [SCOPE_NAMES.ALPHA]: [createChange()],
      });
      const pluginWithNoScope = createPluginRegistration({
        extends: {
          plugin: {
            name: "plugin",
            getChanges,
          },
          scopes: new Set(),
        },
      });

      const pluginContext = createPluginContext({
        scopes: {},
      });

      mockedCreatePluginContext.mockReturnValueOnce(pluginContext);

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({
          extends: {
            plugins: [pluginWithNoScope],
          },
        }),
        createLogger: mockCreateLogger,
      });

      await expect(
        pipeline["executePhase"](
          "getChanges",
          { pipeline: "version", dryRun: false },
          createPrepareState(),
        ),
      ).resolves.toEqual({});

      expect(logger.info).not.toHaveBeenCalled();

      expect(mockedFilterPhaseState).not.toHaveBeenCalled();
      expect(getChanges).not.toHaveBeenCalled();
      expect(mockedAssertPhaseResultScopes).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenNthCalledWith(1, "Starting getChanges phase");
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        "Skipping getChanges phase for plugin plugin because no scopes are enabled",
      );
      expect(logger.debug).toHaveBeenNthCalledWith(3, "Finished getChanges phase");
    });

    it("should wrap the error of a failing plugin in a phase error", async () => {
      const error = new Error("phase failed");
      const failingPlugin = createPluginRegistration({
        extends: {
          plugin: {
            name: "failing-plugin",
            createReleases: vi.fn().mockRejectedValueOnce(error),
          },
        },
      });

      mockedCreatePluginContext.mockReturnValueOnce(createPluginContext());

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({
          extends: { plugins: [failingPlugin] },
        }),
        createLogger: mockCreateLogger,
      });

      await expect(
        pipeline["executePhase"](
          "createReleases",
          { pipeline: "publish", dryRun: false },
          createCreateReleasesState(),
        ),
      ).rejects.toThrow(new CorePhaseError("createReleases", "failing-plugin", error));

      expect(mockedAssertPhaseResultScopes).not.toHaveBeenCalled();
    });

    it("should run every teardown hook, then throw the phase error of the failing one", async () => {
      const error = new Error("teardown failed");
      const failingTeardown = vi.fn().mockRejectedValueOnce(error);
      const teardown = vi.fn().mockResolvedValueOnce(undefined);
      const failingPlugin = createPluginRegistration({
        extends: { plugin: { name: "failing-plugin", teardown: failingTeardown } },
      });
      const plugin = createPluginRegistration({
        extends: { plugin: { name: "plugin", teardown } },
      });

      mockedCreatePluginContext
        .mockReturnValueOnce(createPluginContext())
        .mockReturnValueOnce(createPluginContext());

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({ extends: { plugins: [failingPlugin, plugin] } }),
        createLogger: mockCreateLogger,
      });

      await expect(
        pipeline["executePhase"](
          "teardown",
          { pipeline: "version", dryRun: false, error: undefined },
          {},
        ),
      ).rejects.toThrow(new CorePhaseError("teardown", "failing-plugin", error));

      expect(failingTeardown).toHaveBeenCalledTimes(1);
      expect(teardown).toHaveBeenCalledTimes(1);
      expect(mockedAssertPhaseResultScopes).toHaveBeenCalledTimes(1);
      expect(mockedAssertPhaseResultScopes).toHaveBeenNthCalledWith(
        1,
        "teardown",
        "plugin",
        undefined,
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      );
    });

    it("should throw a teardown error holding every phase error when several teardown hooks fail", async () => {
      const firstError = new Error("first teardown failed");
      const secondError = new Error("second teardown failed");
      const firstPlugin = createPluginRegistration({
        extends: {
          plugin: { name: "first-plugin", teardown: vi.fn().mockRejectedValueOnce(firstError) },
        },
      });
      const secondPlugin = createPluginRegistration({
        extends: {
          plugin: { name: "second-plugin", teardown: vi.fn().mockRejectedValueOnce(secondError) },
        },
      });

      mockedCreatePluginContext
        .mockReturnValueOnce(createPluginContext())
        .mockReturnValueOnce(createPluginContext());

      const pipeline = new Pipeline({
        cwd: CONFIG_CWD,
        config: createResolvedConfig({ extends: { plugins: [firstPlugin, secondPlugin] } }),
        createLogger: mockCreateLogger,
      });

      await expect(
        pipeline["executePhase"](
          "teardown",
          { pipeline: "version", dryRun: false, error: undefined },
          {},
        ),
      ).rejects.toThrow(
        new CoreTeardownError([
          new CorePhaseError("teardown", "first-plugin", firstError),
          new CorePhaseError("teardown", "second-plugin", secondError),
        ]),
      );
    });

    it.each(["initialize", "prepare", "finalize", "teardown"] as const)(
      "should return undefined for the %s phase",
      async (phaseName) => {
        const logger = new MockLogger();

        mockCreateLogger.mockReturnValueOnce(logger);

        const phase = vi.fn().mockResolvedValueOnce(undefined);
        const pluginWithPhase = createPluginRegistration({
          extends: {
            plugin: {
              name: "plugin-with-phase",
              [phaseName]: phase,
            },
          },
        });

        const pluginContext = createPluginContext();

        mockedCreatePluginContext.mockReturnValueOnce(pluginContext);

        const pipeline = new Pipeline({
          cwd: CONFIG_CWD,
          config: createResolvedConfig({
            extends: { plugins: [pluginWithPhase] },
          }),
          createLogger: mockCreateLogger,
        });

        const state = createPrepareState();

        mockedFilterPhaseState.mockReturnValueOnce(state);

        await expect(
          pipeline["executePhase"](phaseName, { pipeline: "version", dryRun: false }, state),
        ).resolves.toEqual(undefined);

        expect(logger.info).not.toHaveBeenCalled();

        expect(logger.debug).toHaveBeenCalledTimes(3);
        expect(logger.debug).toHaveBeenNthCalledWith(1, `Starting ${phaseName} phase`);
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `Executing ${phaseName} phase for plugin: plugin-with-phase`,
        );
        expect(logger.debug).toHaveBeenNthCalledWith(3, `Finished ${phaseName} phase`);

        expect(mockedFilterPhaseState).toHaveBeenCalledTimes(1);
        expect(mockedFilterPhaseState).toHaveBeenNthCalledWith(
          1,
          state,
          new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
        );
        expect(phase).toHaveBeenCalledTimes(1);
        expect(phase).toHaveBeenNthCalledWith(
          1,
          {
            ...pluginContext,
            dryRun: false,
            pipeline: "version",
          },
          state,
        );
        expect(mockedAssertPhaseResultScopes).toHaveBeenCalledTimes(1);
        expect(mockedAssertPhaseResultScopes).toHaveBeenNthCalledWith(
          1,
          phaseName,
          "plugin-with-phase",
          undefined,
          new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
        );
      },
    );
  });
});
