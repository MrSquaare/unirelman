import { SCOPE_NAMES, VERSIONS } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { packageJsonSchema } from "./types";

describe("packageJsonSchema", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep name and version exactly as written", () => {
    expect(
      packageJsonSchema.parse({
        name: `  ${SCOPE_NAMES.ALPHA}  `,
        version: `  ${VERSIONS.DEFAULT}  `,
      }),
    ).toEqual({
      name: `  ${SCOPE_NAMES.ALPHA}  `,
      version: `  ${VERSIONS.DEFAULT}  `,
    });
  });

  it("should keep unknown fields", () => {
    expect(
      packageJsonSchema.parse({
        name: SCOPE_NAMES.ALPHA,
        version: VERSIONS.DEFAULT,
        scripts: { build: "tsdown" },
      }),
    ).toEqual({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
      scripts: { build: "tsdown" },
    });
  });
});
