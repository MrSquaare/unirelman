import type { PipelineOutput, PublishOutput, VersionOutput } from "../types/output";

import * as thisMod from "./pipeline-summary";

const DRY_RUN_LINE = "Dry run: nothing was changed.";

export const resolveVersionSummary = (output: VersionOutput): string[] => {
  const lines = Object.entries(output.scopes).map(([scopeName, { currentVersion, nextVersion }]) =>
    currentVersion === null
      ? `${scopeName}: ${nextVersion}`
      : `${scopeName}: ${currentVersion} → ${nextVersion}`,
  );

  return lines.length > 0 ? lines : ["Nothing to version."];
};

export const resolvePublishSummary = (output: PublishOutput): string[] => {
  const lines = Object.entries(output.releases).flatMap(([scopeName, releases]) =>
    releases
      .filter((release) => release.status === "created")
      .map((release) => `${scopeName}: ${release.type} ${release.name}`),
  );

  return lines.length > 0 ? lines : ["Nothing to publish."];
};

export const resolvePipelineSummary = (output: PipelineOutput): string[] => {
  const lines =
    output.pipeline === "version"
      ? thisMod.resolveVersionSummary(output)
      : thisMod.resolvePublishSummary(output);

  return output.dryRun ? [DRY_RUN_LINE, ...lines] : lines;
};
