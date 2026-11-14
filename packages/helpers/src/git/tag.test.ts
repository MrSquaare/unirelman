import { CONFIG_CWD, createScope, VERSIONS } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isRootScope, resolveDefaultGitTag, resolveGitTag } from "./tag";
import * as thisMod from "./tag";

describe("isRootScope", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when scope path is dot", () => {
    const scope = createScope({ extends: { path: "." } });

    expect(isRootScope(scope, CONFIG_CWD)).toEqual(true);
  });

  it("should return true when scope path has trailing slash", () => {
    const scope = createScope({ extends: { path: "./" } });

    expect(isRootScope(scope, CONFIG_CWD)).toEqual(true);
  });

  it("should return true when scope path matches cwd absolute path", () => {
    const scope = createScope({ extends: { path: CONFIG_CWD } });

    expect(isRootScope(scope, CONFIG_CWD)).toEqual(true);
  });

  it("should return false when scope path is a subdirectory", () => {
    const scope = createScope();

    expect(isRootScope(scope, CONFIG_CWD)).toEqual(false);
  });
});

describe("resolveDefaultGitTag", () => {
  it("should return the version for the root scope", () => {
    expect(
      resolveDefaultGitTag({ scopeName: "my-package", version: "1.0.1", isRootScope: true }),
    ).toEqual("1.0.1");
  });

  it("should prefix the version with the scope name for another scope", () => {
    expect(
      resolveDefaultGitTag({ scopeName: "@example/core", version: "1.0.1", isRootScope: false }),
    ).toEqual("@example/core@1.0.1");
  });
});

describe("resolveGitTag", () => {
  const isRootScopeSpy = vi.spyOn(thisMod, "isRootScope");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should format the tag with the scope name, the version and whether the scope is the root", () => {
    const scope = createScope();
    const tagFormat = vi.fn().mockReturnValueOnce("tag");

    isRootScopeSpy.mockReturnValueOnce(true);

    expect(resolveGitTag(scope, VERSIONS.DEFAULT, CONFIG_CWD, tagFormat)).toEqual("tag");
    expect(isRootScopeSpy).toHaveBeenCalledTimes(1);
    expect(isRootScopeSpy).toHaveBeenNthCalledWith(1, scope, CONFIG_CWD);
    expect(tagFormat).toHaveBeenCalledTimes(1);
    expect(tagFormat).toHaveBeenNthCalledWith(1, {
      scopeName: scope.name,
      version: VERSIONS.DEFAULT,
      isRootScope: true,
    });
  });
});
