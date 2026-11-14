import "./helpers/options.mock";
import "./phases/generate-file-operations.mock";
import "./phases/get-current-version.mock";
import "./phases/get-dependency-changes.mock";
import "./phases/create-releases.mock";
import { mockedResolveNpmPluginOptions } from "./helpers/options.mock";
import { mockedCreateCreateReleasesPhase } from "./phases/create-releases.mock";
import { mockedCreateGenerateFileOperationsPhase } from "./phases/generate-file-operations.mock";
import { mockedRunGetCurrentVersionPhase } from "./phases/get-current-version.mock";
import { mockedCreateGetDependencyChangesPhase } from "./phases/get-dependency-changes.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createNpmPlugin } from "./index";

describe("createNpmPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create plugin with custom options and resolve phase handlers", () => {
    const options = { publish: false, updateInternalDependencies: { ranges: "minor" as const } };
    const resolvedOptions = {
      publish: false,
      packageManager: undefined,
      updateInternalDependencies: { ranges: "minor", dependents: "out-of-range" },
    };
    const dummyGetDependencyChanges = vi.fn();
    const dummyGenerateFileOperations = vi.fn();
    const dummyCreateReleases = vi.fn();

    mockedCreateGetDependencyChangesPhase.mockReturnValueOnce(dummyGetDependencyChanges);
    mockedCreateGenerateFileOperationsPhase.mockReturnValueOnce(dummyGenerateFileOperations);
    mockedCreateCreateReleasesPhase.mockReturnValueOnce(dummyCreateReleases);

    const plugin = createNpmPlugin(options);

    expect(mockedResolveNpmPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveNpmPluginOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateGetDependencyChangesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGetDependencyChangesPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(plugin).toEqual({
      name: "npm",
      getCurrentVersion: mockedRunGetCurrentVersionPhase,
      getDependencyChanges: dummyGetDependencyChanges,
      generateFileOperations: dummyGenerateFileOperations,
      createReleases: dummyCreateReleases,
    });
  });

  it("should create plugin with default options", () => {
    const resolvedOptions = {
      publish: true,
      packageManager: undefined,
      updateInternalDependencies: { ranges: "patch", dependents: "out-of-range" },
    };

    createNpmPlugin();

    expect(mockedResolveNpmPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveNpmPluginOptions).toHaveBeenNthCalledWith(1, {});
    expect(mockedCreateGetDependencyChangesPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
  });
});
