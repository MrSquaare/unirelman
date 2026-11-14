import type { PipelineResult } from "@unirelman/core";

import { dedupeFileOperations } from "@unirelman/core";
import { relative } from "node:path";

import type { PipelineOutput, PublishOutput, VersionOutput } from "../types/output";

import * as thisMod from "./pipeline-output";

export const resolveVersionOutput = (
  cwd: string,
  result: Extract<PipelineResult, { pipeline: "version" }>,
): VersionOutput => {
  const scopes: VersionOutput["scopes"] = {};

  for (const scopeName in result.nextVersions) {
    scopes[scopeName] = {
      currentVersion: result.currentVersions[scopeName]?.version ?? null,
      nextVersion: result.nextVersions[scopeName].version,
    };
  }

  const files = dedupeFileOperations(result.fileOperations).map((fileOperation) => ({
    path: relative(cwd, fileOperation.path),
    action: fileOperation.action,
  }));

  return {
    pipeline: result.pipeline,
    dryRun: result.dryRun,
    scopes,
    files,
  };
};

export const resolvePublishOutput = (
  result: Extract<PipelineResult, { pipeline: "publish" }>,
): PublishOutput => {
  const releases: PublishOutput["releases"] = {};

  for (const scopeName in result.releases) {
    releases[scopeName] = result.releases[scopeName].map(({ type, name, status, meta }) => ({
      type,
      name,
      status,
      meta: { ...meta },
    }));
  }

  return {
    pipeline: result.pipeline,
    dryRun: result.dryRun,
    releases,
  };
};

export const resolvePipelineOutput = (cwd: string, result: PipelineResult): PipelineOutput => {
  if (result.pipeline === "version") {
    return thisMod.resolveVersionOutput(cwd, result);
  }

  return thisMod.resolvePublishOutput(result);
};
