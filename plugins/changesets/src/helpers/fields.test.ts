import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChangesetsInvalidLevelError } from "../errors";
import { parseLevel, parseMessage, parseScopes } from "./fields";

describe("parseScopes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should trim and filter scopes from comma separated input", () => {
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];

    expect(parseScopes(` ${scopes[0]},  ${scopes[1]} , , `)).toEqual(scopes);
  });

  it("should return empty array when scopes arg is undefined", () => {
    expect(parseScopes(undefined)).toEqual([]);
  });

  it("should return empty array when scopes arg is empty string", () => {
    expect(parseScopes("")).toEqual([]);
  });
});

describe("parseLevel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should normalize supported level values", () => {
    expect(parseLevel("MAJOR")).toEqual("major");
  });

  it("should return undefined when level arg is undefined", () => {
    expect(parseLevel(undefined)).toEqual(undefined);
  });

  it("should return undefined when level arg is empty string", () => {
    expect(parseLevel("")).toEqual(undefined);
  });

  it("should throw for invalid level values", () => {
    expect(() => parseLevel("invalid")).toThrow(new ChangesetsInvalidLevelError("invalid"));
  });
});

describe("parseMessage", () => {
  it("should trim the message", () => {
    expect(parseMessage("  Ship feature  ")).toEqual("Ship feature");
  });

  it("should return undefined when message arg is undefined", () => {
    expect(parseMessage(undefined)).toEqual(undefined);
  });

  it("should return undefined when message arg is blank", () => {
    expect(parseMessage("   ")).toEqual(undefined);
  });
});
