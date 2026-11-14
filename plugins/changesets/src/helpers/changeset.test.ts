import "./fields.mock";
import { mockedParseLevel, mockedParseScopes } from "./fields.mock";

import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ChangesetsInvalidFileError,
  ChangesetsInvalidLevelError,
  ChangesetsInvalidScopesError,
  ChangesetsMissingFieldError,
  ChangesetsMissingFrontmatterError,
} from "../errors";
import * as thisMod from "./changeset";
import {
  assertKnownScopes,
  parseChangeset,
  parseChangesetFile,
  parseChangesetFrontmatter,
  serializeChangeset,
} from "./changeset";

describe("parseChangesetFrontmatter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse key-value entries and ignore invalid lines", () => {
    const scopesStr = `${SCOPE_NAMES.ALPHA},${SCOPE_NAMES.BETA}`;

    expect(
      parseChangesetFrontmatter(`scopes: ${scopesStr}\n\ninvalidLine\n: emptyKey\nlevel: patch`),
    ).toEqual({
      scopes: scopesStr,
      level: "patch",
    });
  });

  it("should return empty object for empty frontmatter content", () => {
    expect(parseChangesetFrontmatter("")).toEqual({});
  });
});

describe("parseChangeset", () => {
  const parseChangesetFrontmatterSpy = vi.spyOn(thisMod, "parseChangesetFrontmatter");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return parsed changeset for valid markdown", () => {
    const scopesStr = `${SCOPE_NAMES.ALPHA},${SCOPE_NAMES.BETA}`;
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];

    expect(parseChangeset(`---\nscopes: ${scopesStr}\nlevel: patch\n---\nMessage\n`)).toEqual({
      scopes,
      level: "patch",
      message: "Message",
    });
    expect(parseChangesetFrontmatterSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetFrontmatterSpy).toHaveBeenNthCalledWith(
      1,
      `scopes: ${scopesStr}\nlevel: patch`,
    );
    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, scopesStr);
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, "patch");
  });

  it("should return parsed changeset for markdown with a blank line after the front matter", () => {
    expect(
      parseChangeset(`---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: minor\n---\n\nMessage\n`),
    ).toEqual({
      scopes: [SCOPE_NAMES.ALPHA],
      level: "minor",
      message: "Message",
    });
  });

  it("should parse windows newlines and trim values", () => {
    const scopesStr = `${SCOPE_NAMES.ALPHA} , ${SCOPE_NAMES.BETA}`;
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];

    expect(
      parseChangeset(`---\r\nscopes:  ${scopesStr} \r\nlevel: MAJOR\r\n---\r\nMessage\r\n`),
    ).toEqual({
      scopes,
      level: "major",
      message: "Message",
    });
    expect(parseChangesetFrontmatterSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetFrontmatterSpy).toHaveBeenNthCalledWith(
      1,
      `scopes:  ${scopesStr} \nlevel: MAJOR`,
    );
    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, scopesStr);
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, "MAJOR");
  });

  it("should throw when the content has no frontmatter block", () => {
    expect(() => parseChangeset("invalid")).toThrow(new ChangesetsMissingFrontmatterError());
    expect(parseChangesetFrontmatterSpy).not.toHaveBeenCalled();
    expect(mockedParseScopes).not.toHaveBeenCalled();
    expect(mockedParseLevel).not.toHaveBeenCalled();
  });

  it("should throw when the changeset has no scopes", () => {
    expect(() => parseChangeset("---\nscopes:  \nlevel: patch\n---\nMessage\n")).toThrow(
      new ChangesetsMissingFieldError("scopes"),
    );
    expect(parseChangesetFrontmatterSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetFrontmatterSpy).toHaveBeenNthCalledWith(1, "scopes:  \nlevel: patch");
    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, "");
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, "patch");
  });

  it("should throw when the changeset has no level", () => {
    expect(() => parseChangeset(`---\nscopes: ${SCOPE_NAMES.ALPHA}\n---\nMessage\n`)).toThrow(
      new ChangesetsMissingFieldError("level"),
    );
    expect(parseChangesetFrontmatterSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetFrontmatterSpy).toHaveBeenNthCalledWith(1, `scopes: ${SCOPE_NAMES.ALPHA}`);
    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, SCOPE_NAMES.ALPHA);
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, undefined);
  });

  it("should throw when the changeset has no message", () => {
    expect(() =>
      parseChangeset(`---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: patch\n---\n   \n`),
    ).toThrow(new ChangesetsMissingFieldError("message"));
    expect(parseChangesetFrontmatterSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetFrontmatterSpy).toHaveBeenNthCalledWith(
      1,
      `scopes: ${SCOPE_NAMES.ALPHA}\nlevel: patch`,
    );
    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, SCOPE_NAMES.ALPHA);
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, "patch");
  });
});

describe("assertKnownScopes", () => {
  it("should accept scopes that are all known", () => {
    expect(assertKnownScopes([SCOPE_NAMES.ALPHA], [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])).toEqual(
      undefined,
    );
  });

  it("should throw with every unknown scope", () => {
    expect(() =>
      assertKnownScopes(
        [SCOPE_NAMES.ALPHA, SCOPE_NAMES.MISSING, SCOPE_NAMES.REMOVED],
        [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      ),
    ).toThrow(
      new ChangesetsInvalidScopesError(
        [SCOPE_NAMES.MISSING, SCOPE_NAMES.REMOVED],
        [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      ),
    );
  });
});

describe("parseChangesetFile", () => {
  const parseChangesetSpy = vi.spyOn(thisMod, "parseChangeset");
  const assertKnownScopesSpy = vi.spyOn(thisMod, "assertKnownScopes");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse the changeset and check its scopes", () => {
    const content = `---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: patch\n---\nMessage\n`;

    expect(
      parseChangesetFile({ path: "a.md", content }, [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
    ).toEqual({ scopes: [SCOPE_NAMES.ALPHA], level: "patch", message: "Message" });
    expect(parseChangesetSpy).toHaveBeenCalledTimes(1);
    expect(parseChangesetSpy).toHaveBeenNthCalledWith(1, content);
    expect(assertKnownScopesSpy).toHaveBeenCalledTimes(1);
    expect(assertKnownScopesSpy).toHaveBeenNthCalledWith(
      1,
      [SCOPE_NAMES.ALPHA],
      [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
    );
  });

  it("should throw an invalid file error when the changeset cannot be parsed", () => {
    expect(() =>
      parseChangesetFile(
        { path: "a.md", content: `---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: huge\n---\nMessage\n` },
        [SCOPE_NAMES.ALPHA],
      ),
    ).toThrow(new ChangesetsInvalidFileError("a.md", new ChangesetsInvalidLevelError("huge")));
    expect(assertKnownScopesSpy).not.toHaveBeenCalled();
  });

  it("should throw an invalid file error when the changeset has unknown scopes", () => {
    expect(() =>
      parseChangesetFile(
        {
          path: "a.md",
          content: `---\nscopes: ${SCOPE_NAMES.REMOVED}\nlevel: patch\n---\nMessage\n`,
        },
        [SCOPE_NAMES.ALPHA],
      ),
    ).toThrow(
      new ChangesetsInvalidFileError(
        "a.md",
        new ChangesetsInvalidScopesError([SCOPE_NAMES.REMOVED], [SCOPE_NAMES.ALPHA]),
      ),
    );
  });
});

describe("serializeChangeset", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should serialize parsed changeset to expected markdown", () => {
    const changeset = {
      scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      level: "minor" as const,
      message: "Ship feature",
    };

    expect(serializeChangeset(changeset)).toEqual(
      `---\nscopes: ${changeset.scopes.join(",")}\nlevel: ${changeset.level}\n---\n\n${changeset.message}\n`,
    );
  });
});
