import { afterEach, describe, expect, it, vi } from "vitest";

import { pipelineOutputSchema } from "./output";

describe("pipelineOutputSchema", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse a version output", () => {
    expect(
      pipelineOutputSchema.parse({
        pipeline: "version",
        dryRun: false,
        scopes: { "@scope/a": { currentVersion: null, nextVersion: "1.0.0" } },
        files: [{ path: "CHANGELOG.md", action: "write" }],
      }),
    ).toEqual({
      pipeline: "version",
      dryRun: false,
      scopes: new Map([["@scope/a", { currentVersion: null, nextVersion: "1.0.0" }]]),
      files: [{ path: "CHANGELOG.md", action: "write" }],
    });
  });

  it("should parse a publish output", () => {
    const release = {
      type: "git-tag",
      name: "@scope/a@1.0.0",
      status: "existing",
      meta: { id: 42 },
    } as const;

    expect(
      pipelineOutputSchema.parse({
        pipeline: "publish",
        dryRun: true,
        releases: { "@scope/a": [release] },
      }),
    ).toEqual({
      pipeline: "publish",
      dryRun: true,
      releases: new Map([["@scope/a", [release]]]),
    });
  });

  it("should reject an unknown pipeline", () => {
    expect(pipelineOutputSchema.safeParse({ pipeline: "deploy", dryRun: false }).success).toEqual(
      false,
    );
  });
});
