import { mockedResolveCommandEnvironment } from "./env.mock";

import { publishOutputSchema, versionOutputSchema } from "@unirelman/cli/output";
import { mockedGetExecOutput } from "@unirelman/testing/mocks/actions/exec";
import { mockedParseJSON } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveUnirelmanEnvironment,
  runUnirelman,
  runUnirelmanPublish,
  runUnirelmanVersion,
} from "./cli";
import * as thisMod from "./cli";

const PUBLISH_OUTPUT = {
  pipeline: "publish" as const,
  dryRun: false,
  releases: new Map(),
};
const ENVIRONMENT = { PATH: "/usr/bin", GITHUB_TOKEN: "token" };

describe("resolveUnirelmanEnvironment", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass the GitHub token to the CLI environment", () => {
    expect(resolveUnirelmanEnvironment({ PATH: "/usr/bin" }, "token")).toEqual({
      PATH: "/usr/bin",
      GITHUB_TOKEN: "token",
    });
    expect(mockedResolveCommandEnvironment).toHaveBeenCalledTimes(1);
    expect(mockedResolveCommandEnvironment).toHaveBeenNthCalledWith(
      1,
      { PATH: "/usr/bin" },
      { GITHUB_TOKEN: "token" },
    );
  });
});

describe("runUnirelman", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run the command and parse its stdout with the schema", async () => {
    const stdout = '{"pipeline":"publish","dryRun":false,"releases":{}}';

    mockedGetExecOutput.mockResolvedValueOnce({ exitCode: 0, stdout, stderr: "" });

    await expect(
      runUnirelman(
        "npx unirelman",
        ["publish", "--json"],
        publishOutputSchema,
        "/workspace",
        ENVIRONMENT,
      ),
    ).resolves.toEqual(PUBLISH_OUTPUT);
    expect(mockedGetExecOutput).toHaveBeenCalledTimes(1);
    expect(mockedGetExecOutput).toHaveBeenNthCalledWith(1, "npx unirelman", ["publish", "--json"], {
      cwd: "/workspace",
      env: ENVIRONMENT,
    });
    expect(mockedParseJSON).toHaveBeenCalledTimes(1);
    expect(mockedParseJSON).toHaveBeenNthCalledWith(
      1,
      "npx unirelman publish --json",
      stdout,
      publishOutputSchema,
    );
  });
});

describe("runUnirelmanPublish", () => {
  const runUnirelmanSpy = vi.spyOn(thisMod, "runUnirelman");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run the publish pipeline with JSON output", async () => {
    runUnirelmanSpy.mockResolvedValueOnce(PUBLISH_OUTPUT);

    await expect(runUnirelmanPublish("npx unirelman", "/workspace", ENVIRONMENT)).resolves.toEqual(
      PUBLISH_OUTPUT,
    );
    expect(runUnirelmanSpy).toHaveBeenCalledTimes(1);
    expect(runUnirelmanSpy).toHaveBeenNthCalledWith(
      1,
      "npx unirelman",
      ["publish", "--json"],
      publishOutputSchema,
      "/workspace",
      ENVIRONMENT,
    );
  });
});

describe("runUnirelmanVersion", () => {
  const runUnirelmanSpy = vi.spyOn(thisMod, "runUnirelman");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run the version pipeline with JSON output", async () => {
    const output = { pipeline: "version" as const, dryRun: false, scopes: new Map(), files: [] };

    runUnirelmanSpy.mockResolvedValueOnce(output);

    await expect(runUnirelmanVersion("npx unirelman", "/workspace", ENVIRONMENT)).resolves.toEqual(
      output,
    );
    expect(runUnirelmanSpy).toHaveBeenCalledTimes(1);
    expect(runUnirelmanSpy).toHaveBeenNthCalledWith(
      1,
      "npx unirelman",
      ["version", "--json"],
      versionOutputSchema,
      "/workspace",
      ENVIRONMENT,
    );
  });
});
