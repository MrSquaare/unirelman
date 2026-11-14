import { describe, expect, it } from "vitest";

import { resolveGroupLabel } from "./label";

describe("resolveGroupLabel", () => {
  it("should name the group with its scopes", () => {
    expect(resolveGroupLabel({ name: "product", scopes: ["@scope/a", "@scope/b"] })).toEqual(
      "group product (@scope/a, @scope/b)",
    );
  });
});
