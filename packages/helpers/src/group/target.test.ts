import { mockedResolveGroupLabel } from "./label.mock";

import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveGroupTargetLabel, resolveGroupTargets, resolveIndependentScopes } from "./target";

describe("resolveIndependentScopes", () => {
  it("should return the scopes that belong to no group", () => {
    expect(
      resolveIndependentScopes(
        [{ name: "core", scopes: [SCOPE_NAMES.ALPHA] }],
        [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      ),
    ).toEqual([SCOPE_NAMES.BETA]);
  });

  it("should return every scope when there is no group", () => {
    expect(resolveIndependentScopes([], [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])).toEqual([
      SCOPE_NAMES.ALPHA,
      SCOPE_NAMES.BETA,
    ]);
  });
});

describe("resolveGroupTargets", () => {
  it("should list groups first, then one target per independent scope", () => {
    expect(
      resolveGroupTargets([{ name: "core", scopes: [SCOPE_NAMES.ALPHA] }], [SCOPE_NAMES.BETA]),
    ).toEqual([
      { group: "core", scopes: [SCOPE_NAMES.ALPHA] },
      { group: undefined, scopes: [SCOPE_NAMES.BETA] },
    ]);
  });
});

describe("resolveGroupTargetLabel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should label a group target with the group label", () => {
    expect(resolveGroupTargetLabel({ group: "core", scopes: [SCOPE_NAMES.ALPHA] })).toEqual(
      `group core (${SCOPE_NAMES.ALPHA})`,
    );

    expect(mockedResolveGroupLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupLabel).toHaveBeenNthCalledWith(1, {
      name: "core",
      scopes: [SCOPE_NAMES.ALPHA],
    });
  });

  it("should label an independent scope target with its scope", () => {
    expect(resolveGroupTargetLabel({ group: undefined, scopes: [SCOPE_NAMES.ALPHA] })).toEqual(
      `scope ${SCOPE_NAMES.ALPHA}`,
    );

    expect(mockedResolveGroupLabel).not.toHaveBeenCalled();
  });
});
