import { describe, expect, it } from "vitest";

import { resolveReplacePluginOptions } from "./options";

describe("resolveReplacePluginOptions", () => {
  it("should keep the allowNoMatch option of each file", () => {
    const file = {
      path: "README.md",
      scope: "@scope/a",
      search: /my-package@\d+\.\d+\.\d+/,
      replace: () => "my-package@1.0.1",
      allowNoMatch: true,
    };

    expect(resolveReplacePluginOptions({ files: [file] })).toEqual({ files: [file] });
  });

  it("should default allowNoMatch to false", () => {
    const file = {
      path: "README.md",
      scope: "@scope/a",
      search: /my-package@\d+\.\d+\.\d+/,
      replace: () => "my-package@1.0.1",
    };

    expect(resolveReplacePluginOptions({ files: [file] })).toEqual({
      files: [{ ...file, allowNoMatch: false }],
    });
  });
});
