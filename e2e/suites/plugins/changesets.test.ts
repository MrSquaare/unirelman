import { describe } from "vitest";

import { test } from "../../lib/test.ts";

describe.concurrent("changesets", () => {
  test("should print the created changeset as JSON", async ({ expect, workspace }) => {
    const result = await workspace.runCLI([
      "changesets",
      "create",
      "--json",
      "--scopes",
      "example",
      "--level",
      "patch",
      "--message",
      "fix a bug",
    ]);

    expect(result.stdout).toMatchSnapshot();
  });

  test("should keep each scope of a changeset once", async ({ expect, workspace }) => {
    const result = await workspace.runCLI([
      "changesets",
      "create",
      "--json",
      "--scopes",
      "example, example",
      "--level",
      "patch",
      "--message",
      "fix a bug",
    ]);

    expect(JSON.parse(result.stdout).scopes).toEqual(["example"]);
  });
});
