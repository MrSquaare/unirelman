import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { describe, expect, it } from "vitest";

import { GroupDuplicateScopeError, GroupEmptyError, GroupUnknownScopeError } from "./errors";
import { resolveGroups } from "./resolver";

describe("resolveGroups", () => {
  it("should return one group named all with every scope for true", () => {
    expect(resolveGroups(true, [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])).toEqual([
      { name: "all", scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA] },
    ]);
  });

  it("should return no group for false", () => {
    expect(resolveGroups(false, [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])).toEqual([]);
  });

  it("should return the configured groups", () => {
    expect(
      resolveGroups({ core: [SCOPE_NAMES.ALPHA], ui: [SCOPE_NAMES.BETA] }, [
        SCOPE_NAMES.ALPHA,
        SCOPE_NAMES.BETA,
      ]),
    ).toEqual([
      { name: "core", scopes: [SCOPE_NAMES.ALPHA] },
      { name: "ui", scopes: [SCOPE_NAMES.BETA] },
    ]);
  });

  it("should throw when a group is empty", () => {
    expect(() => resolveGroups({ ui: [] }, [SCOPE_NAMES.ALPHA])).toThrow(new GroupEmptyError("ui"));
  });

  it("should throw when a group lists a scope outside the plugin", () => {
    expect(() => resolveGroups({ ui: [SCOPE_NAMES.BETA] }, [SCOPE_NAMES.ALPHA])).toThrow(
      new GroupUnknownScopeError("ui", SCOPE_NAMES.BETA, [SCOPE_NAMES.ALPHA]),
    );
  });

  it("should throw when a scope is in two groups", () => {
    expect(() =>
      resolveGroups({ core: [SCOPE_NAMES.ALPHA], ui: [SCOPE_NAMES.ALPHA] }, [SCOPE_NAMES.ALPHA]),
    ).toThrow(new GroupDuplicateScopeError(SCOPE_NAMES.ALPHA));
  });
});
