import { CONFIG_CWD } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChangelogInvalidHeaderError, ChangelogInvalidSectionHeaderError } from "../errors";
import {
  isChangelogSectionHeading,
  resolveChangelogHeader,
  resolveChangelogPath,
  resolveChangelogSectionHeading,
  resolveDefaultChangelogNoChangeMessage,
  resolveRootChangelogSectionHeader,
  resolveScopeChangelogHeader,
  resolveScopeChangelogSectionHeader,
} from "./changelog";
import * as thisMod from "./changelog";

describe("resolveChangelogPath", () => {
  it("should return root changelog path for root mode", () => {
    expect(resolveChangelogPath(CONFIG_CWD, "packages/a", "root")).toEqual(
      `${CONFIG_CWD}/CHANGELOG.md`,
    );
  });

  it("should return scope-local changelog path for scope mode", () => {
    expect(resolveChangelogPath(CONFIG_CWD, `${CONFIG_CWD}/packages/a`, "scope")).toEqual(
      `${CONFIG_CWD}/packages/a/CHANGELOG.md`,
    );
  });
});

describe("isChangelogSectionHeading", () => {
  it("should return true for a level-two heading", () => {
    expect(isChangelogSectionHeading("## @scope/a@1.0.0")).toEqual(true);
  });

  it("should return false for another line", () => {
    expect(isChangelogSectionHeading("### Patch changes")).toEqual(false);
  });
});

describe("resolveRootChangelogSectionHeader", () => {
  it("should name the section after the scope and the version", () => {
    expect(resolveRootChangelogSectionHeader({ scopeName: "@scope/a", version: "1.0.1" })).toEqual(
      "## @scope/a - 1.0.1",
    );
  });
});

describe("resolveScopeChangelogSectionHeader", () => {
  it("should name the section after the version", () => {
    expect(resolveScopeChangelogSectionHeader({ scopeName: "@scope/a", version: "1.0.1" })).toEqual(
      "## 1.0.1",
    );
  });
});

describe("resolveScopeChangelogHeader", () => {
  it("should title the changelog after the scope", () => {
    expect(resolveScopeChangelogHeader({ scopeName: "@scope/a" })).toEqual("# @scope/a Changelog");
  });
});

describe("resolveDefaultChangelogNoChangeMessage", () => {
  it("should return the default message", () => {
    expect(resolveDefaultChangelogNoChangeMessage()).toEqual("No user-facing changes.");
  });
});

describe("resolveChangelogSectionHeading", () => {
  const isChangelogSectionHeadingSpy = vi.spyOn(thisMod, "isChangelogSectionHeading");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the heading built by the section header", () => {
    const sectionHeader = vi.fn().mockReturnValueOnce("## 1.0.1");

    expect(resolveChangelogSectionHeading(sectionHeader, "@scope/a", "1.0.1")).toEqual("## 1.0.1");
    expect(sectionHeader).toHaveBeenCalledTimes(1);
    expect(sectionHeader).toHaveBeenNthCalledWith(1, { scopeName: "@scope/a", version: "1.0.1" });
    expect(isChangelogSectionHeadingSpy).toHaveBeenCalledTimes(1);
    expect(isChangelogSectionHeadingSpy).toHaveBeenNthCalledWith(1, "## 1.0.1");
  });

  it("should throw when the heading is not a level-two heading", () => {
    expect(() => resolveChangelogSectionHeading(() => "# 1.0.1", "@scope/a", "1.0.1")).toThrow(
      new ChangelogInvalidSectionHeaderError("# 1.0.1"),
    );
  });

  it("should throw when the heading spans several lines", () => {
    expect(() =>
      resolveChangelogSectionHeading(() => "## 1.0.1\nextra", "@scope/a", "1.0.1"),
    ).toThrow(new ChangelogInvalidSectionHeaderError("## 1.0.1\nextra"));
  });
});

describe("resolveChangelogHeader", () => {
  const isChangelogSectionHeadingSpy = vi.spyOn(thisMod, "isChangelogSectionHeading");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the header when it is a string", () => {
    expect(resolveChangelogHeader("# Changelog\n\nAll changes.", "@scope/a")).toEqual(
      "# Changelog\n\nAll changes.",
    );
    expect(isChangelogSectionHeadingSpy).toHaveBeenCalledTimes(3);
    expect(isChangelogSectionHeadingSpy).toHaveBeenNthCalledWith(1, "# Changelog");
    expect(isChangelogSectionHeadingSpy).toHaveBeenNthCalledWith(2, "");
    expect(isChangelogSectionHeadingSpy).toHaveBeenNthCalledWith(3, "All changes.");
  });

  it("should return the result of the header when it is a function", () => {
    const header = vi.fn().mockReturnValueOnce("# @scope/a");

    expect(resolveChangelogHeader(header, "@scope/a")).toEqual("# @scope/a");
    expect(header).toHaveBeenCalledTimes(1);
    expect(header).toHaveBeenNthCalledWith(1, { scopeName: "@scope/a" });
  });

  it("should throw when the header contains a section heading", () => {
    expect(() => resolveChangelogHeader("# History\n\n## Intro", "@scope/a")).toThrow(
      new ChangelogInvalidHeaderError("# History\n\n## Intro"),
    );
  });
});
