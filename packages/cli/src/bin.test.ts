import { mockedRunCLI } from "./run.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

describe("bin", () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;

    vi.clearAllMocks();
  });

  it("should run the CLI with the arguments after the node and script paths", async () => {
    process.argv = ["/usr/bin/node", "/usr/bin/unirelman", "version", "--dry-run"];

    mockedRunCLI.mockResolvedValueOnce(undefined);

    await import("./bin");

    expect(mockedRunCLI).toHaveBeenCalledTimes(1);
    expect(mockedRunCLI).toHaveBeenNthCalledWith(1, ["version", "--dry-run"]);
  });
});
