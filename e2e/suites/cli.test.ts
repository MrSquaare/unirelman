import { describe } from "vitest";

import { test } from "../lib/test.ts";

describe.concurrent("cli", () => {
  test("should print the usage of a command", async ({ expect, workspace }) => {
    const result = await workspace.runCLI(["changesets", "create", "--help"]);

    expect({ stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
  });

  test("should print the usage and fail without a command", async ({ expect, workspace }) => {
    const result = await workspace.runCLI(["--plain"], { exitCode: 1 });

    expect({ stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
  });

  test("should fail on an unknown option of a command", async ({ expect, workspace }) => {
    const result = await workspace.runCLI(["--plain", "changesets", "create", "--levle", "patch"], {
      exitCode: 1,
    });

    expect({ stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
  });

  test("should fail when an option that would be prompted is missing outside a terminal", async ({
    expect,
    workspace,
  }) => {
    const result = await workspace.runCLI(
      ["changesets", "create", "--scopes", "example", "--level", "patch"],
      { exitCode: 1 },
    );

    expect({ stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
    expect(await workspace.git.readStatus()).toEqual("");
  });
});
