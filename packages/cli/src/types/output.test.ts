import { afterEach, describe, expect, it, vi } from "vitest";

import { pipelineOutputSchema } from "./output";

describe("pipelineOutputSchema", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse a version output", () => {
    const output = {
      pipeline: "version",
      dryRun: false,
      scopes: { "@scope/a": { currentVersion: null, nextVersion: "1.0.0" } },
      files: [{ path: "CHANGELOG.md", action: "write" }],
    };

    expect(pipelineOutputSchema.parse(output)).toEqual(output);
  });

  it("should parse a publish output", () => {
    const output = {
      pipeline: "publish",
      dryRun: true,
      releases: {
        "@scope/a": [
          { type: "git-tag", name: "@scope/a@1.0.0", status: "existing", meta: { id: 42 } },
        ],
      },
    };

    expect(pipelineOutputSchema.parse(output)).toEqual(output);
  });

  it("should reject an unknown pipeline", () => {
    expect(pipelineOutputSchema.safeParse({ pipeline: "deploy", dryRun: false }).success).toEqual(
      false,
    );
  });
});
