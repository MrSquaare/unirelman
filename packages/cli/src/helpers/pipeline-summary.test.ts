import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./pipeline-summary";
import {
  resolvePipelineSummary,
  resolvePublishSummary,
  resolveVersionSummary,
} from "./pipeline-summary";

describe("resolveVersionSummary", () => {
  it("should return one line per versioned scope", () => {
    expect(
      resolveVersionSummary({
        pipeline: "version",
        dryRun: false,
        scopes: {
          "@scope/a": { currentVersion: "1.0.0", nextVersion: "1.0.1" },
          "@scope/b": { currentVersion: "2.0.0", nextVersion: "2.1.0" },
        },
        files: [],
      }),
    ).toEqual(["@scope/a: 1.0.0 → 1.0.1", "@scope/b: 2.0.0 → 2.1.0"]);
  });

  it("should return only the next version of a scope without current version", () => {
    expect(
      resolveVersionSummary({
        pipeline: "version",
        dryRun: false,
        scopes: { "@scope/a": { currentVersion: null, nextVersion: "1.0.0" } },
        files: [],
      }),
    ).toEqual(["@scope/a: 1.0.0"]);
  });

  it("should return nothing to version line when no scope is versioned", () => {
    expect(
      resolveVersionSummary({ pipeline: "version", dryRun: false, scopes: {}, files: [] }),
    ).toEqual(["Nothing to version."]);
  });
});

describe("resolvePublishSummary", () => {
  it("should return one line per created release", () => {
    expect(
      resolvePublishSummary({
        pipeline: "publish",
        dryRun: false,
        releases: {
          "@scope/a": [
            { type: "git-tag", name: "@scope/a@1.0.1", status: "created", meta: {} },
            { type: "npm", name: "@scope/a@1.0.1", status: "existing", meta: {} },
          ],
        },
      }),
    ).toEqual(["@scope/a: git-tag @scope/a@1.0.1"]);
  });

  it("should return nothing to publish line when no release is created", () => {
    expect(
      resolvePublishSummary({
        pipeline: "publish",
        dryRun: false,
        releases: {
          "@scope/a": [{ type: "git-tag", name: "@scope/a@1.0.1", status: "existing", meta: {} }],
        },
      }),
    ).toEqual(["Nothing to publish."]);
  });
});

describe("resolvePipelineSummary", () => {
  const resolveVersionSummarySpy = vi.spyOn(thisMod, "resolveVersionSummary");
  const resolvePublishSummarySpy = vi.spyOn(thisMod, "resolvePublishSummary");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return version summary for the version pipeline", () => {
    const output = { pipeline: "version" as const, dryRun: false, scopes: {}, files: [] };

    resolveVersionSummarySpy.mockReturnValueOnce(["@scope/a: 1.0.0 → 1.0.1"]);

    expect(resolvePipelineSummary(output)).toEqual(["@scope/a: 1.0.0 → 1.0.1"]);

    expect(resolveVersionSummarySpy).toHaveBeenCalledTimes(1);
    expect(resolveVersionSummarySpy).toHaveBeenNthCalledWith(1, output);
    expect(resolvePublishSummarySpy).not.toHaveBeenCalled();
  });

  it("should return publish summary for the publish pipeline", () => {
    const output = { pipeline: "publish" as const, dryRun: false, releases: {} };

    resolvePublishSummarySpy.mockReturnValueOnce(["@scope/a: git-tag @scope/a@1.0.1"]);

    expect(resolvePipelineSummary(output)).toEqual(["@scope/a: git-tag @scope/a@1.0.1"]);

    expect(resolvePublishSummarySpy).toHaveBeenCalledTimes(1);
    expect(resolvePublishSummarySpy).toHaveBeenNthCalledWith(1, output);
    expect(resolveVersionSummarySpy).not.toHaveBeenCalled();
  });

  it("should prefix summary with dry run line when dry run is enabled", () => {
    const output = { pipeline: "version" as const, dryRun: true, scopes: {}, files: [] };

    resolveVersionSummarySpy.mockReturnValueOnce(["@scope/a: 1.0.0 → 1.0.1"]);

    expect(resolvePipelineSummary(output)).toEqual([
      "Dry run: nothing was changed.",
      "@scope/a: 1.0.0 → 1.0.1",
    ]);
  });
});
