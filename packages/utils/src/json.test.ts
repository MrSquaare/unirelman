import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { InvalidJSONError, parseJSON } from "./json";

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
