import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { createRecordMapSchema, InvalidJSONError, parseJSON } from "./json";

const SOURCE = "/repo/file.json";

describe("InvalidJSONError", () => {
  describe("constructor", () => {
    it("should initialize InvalidJSONError with name, properties, and message", () => {
      const error = new InvalidJSONError(SOURCE, "expected object");

      expect(error.name).toEqual("InvalidJSONError");
      expect(error.source).toEqual(SOURCE);
      expect(error.details).toEqual("expected object");
      expect(error.message).toEqual("Invalid JSON in /repo/file.json\nexpected object");
    });
  });
});

describe("parseJSON", () => {
  const schema = z.object({ key: z.string() });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return data validated by schema", () => {
    expect(parseJSON(SOURCE, '{"key":"value"}', schema)).toEqual({ key: "value" });
  });

  it("should throw when content is not valid json", () => {
    expect(() => parseJSON(SOURCE, "{ invalid json }", schema)).toThrow(
      new InvalidJSONError(
        SOURCE,
        "Expected property name or '}' in JSON at position 2 (line 1 column 3)",
      ),
    );
  });

  it("should throw when data does not match schema", () => {
    expect(() => parseJSON(SOURCE, '{"key":1}', schema)).toThrow(
      new InvalidJSONError(SOURCE, "✖ Invalid input: expected string, received number\n  → at key"),
    );
  });

  it("should rethrow unexpected parse errors", () => {
    const error = new Error("Unexpected error");
    const parseSpy = vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
      throw error;
    });

    expect(() => parseJSON(SOURCE, '{"key":"value"}', schema)).toThrow(error);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenNthCalledWith(1, '{"key":"value"}');
  });
});

describe("createRecordMapSchema", () => {
  const schema = createRecordMapSchema(z.object({ channel: z.string() }));

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should decode an object into a map of its entries", () => {
    expect(schema.parse({ alpha: { channel: "beta" }, beta: { channel: "rc" } })).toEqual(
      new Map([
        ["alpha", { channel: "beta" }],
        ["beta", { channel: "rc" }],
      ]),
    );
  });

  it("should encode a map into an object of its entries", () => {
    expect(z.encode(schema, new Map([["alpha", { channel: "beta" }]]))).toEqual({
      alpha: { channel: "beta" },
    });
  });

  it("should keep an own __proto__ key", () => {
    expect(schema.parse(Object.fromEntries([["__proto__", { channel: "beta" }]]))).toEqual(
      new Map([["__proto__", { channel: "beta" }]]),
    );
  });

  it("should reject an array", () => {
    expect(schema.safeParse([]).error?.issues).toEqual([
      { code: "custom", path: [], message: "Invalid input: expected object" },
    ]);
  });

  it("should reject null", () => {
    expect(schema.safeParse(null).error?.issues).toEqual([
      { code: "custom", path: [], message: "Invalid input: expected object" },
    ]);
  });

  it("should reject an entry that does not match the value schema", () => {
    expect(schema.safeParse({ alpha: {} }).error?.issues).toEqual([
      {
        code: "invalid_type",
        expected: "string",
        path: ["alpha", "channel"],
        message: "Invalid input: expected string, received undefined",
      },
    ]);
  });
});
