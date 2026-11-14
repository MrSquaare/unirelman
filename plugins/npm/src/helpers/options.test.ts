import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveNpmPluginOptions } from "./options";

describe("resolveNpmPluginOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve provided custom options", () => {
    expect(
      resolveNpmPluginOptions({
        publish: false,
        packageManager: "pnpm",
        updateInternalDependencies: { ranges: "minor", dependents: "always" },
      }),
    ).toEqual({
      publish: false,
      packageManager: "pnpm",
      updateInternalDependencies: { ranges: "minor", dependents: "always" },
    });
  });

  it("should fallback to default options when no options are provided", () => {
    expect(resolveNpmPluginOptions()).toEqual({
      publish: true,
      packageManager: undefined,
      updateInternalDependencies: { ranges: "patch", dependents: "out-of-range" },
    });
  });
});
