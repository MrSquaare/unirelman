import { mockedCreateInteractiveRenderer } from "./interactive.mock";
import { mockedCreateJSONRenderer } from "./json.mock";
import { mockedCreatePlainRenderer } from "./plain.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createRenderer, readTerminalState, resolveOutputMode } from ".";
import { MockRenderer } from "../testing/mocks/renderer";

describe("readTerminalState", () => {
  const stdinIsTTY = process.stdin.isTTY;
  const stderrIsTTY = process.stderr.isTTY;

  afterEach(() => {
    process.stdin.isTTY = stdinIsTTY;
    process.stderr.isTTY = stderrIsTTY;
  });

  it("should return true for streams attached to a terminal", () => {
    process.stdin.isTTY = true;
    process.stderr.isTTY = true;

    expect(readTerminalState()).toEqual({ stdin: true, stderr: true });
  });

  it("should return false for streams not attached to a terminal", () => {
    process.stdin.isTTY = false;
    process.stderr.isTTY = false;

    expect(readTerminalState()).toEqual({ stdin: false, stderr: false });
  });
});

describe("resolveOutputMode", () => {
  it("should return the requested mode", () => {
    expect(resolveOutputMode("json", { stdin: true, stderr: true })).toEqual("json");
  });

  it("should return interactive when no mode is requested and stdin and stderr are terminals", () => {
    expect(resolveOutputMode(undefined, { stdin: true, stderr: true })).toEqual("interactive");
  });

  it("should return plain when no mode is requested and stdin is not a terminal", () => {
    expect(resolveOutputMode(undefined, { stdin: false, stderr: true })).toEqual("plain");
  });

  it("should return plain when no mode is requested and stderr is not a terminal", () => {
    expect(resolveOutputMode(undefined, { stdin: true, stderr: false })).toEqual("plain");
  });
});

describe("createRenderer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create interactive renderer for interactive mode", () => {
    const renderer = new MockRenderer();

    mockedCreateInteractiveRenderer.mockReturnValueOnce(renderer);

    expect(createRenderer("interactive", true)).toEqual(renderer);

    expect(mockedCreateInteractiveRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreateInteractiveRenderer).toHaveBeenNthCalledWith(1, { verbose: true });
    expect(mockedCreatePlainRenderer).not.toHaveBeenCalled();
    expect(mockedCreateJSONRenderer).not.toHaveBeenCalled();
  });

  it("should create plain renderer for plain mode", () => {
    const renderer = new MockRenderer();

    mockedCreatePlainRenderer.mockReturnValueOnce(renderer);

    expect(createRenderer("plain", false)).toEqual(renderer);

    expect(mockedCreatePlainRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreatePlainRenderer).toHaveBeenNthCalledWith(1, { verbose: false });
    expect(mockedCreateInteractiveRenderer).not.toHaveBeenCalled();
    expect(mockedCreateJSONRenderer).not.toHaveBeenCalled();
  });

  it("should create JSON renderer for json mode", () => {
    const renderer = new MockRenderer();

    mockedCreateJSONRenderer.mockReturnValueOnce(renderer);

    expect(createRenderer("json", false)).toEqual(renderer);

    expect(mockedCreateJSONRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreateJSONRenderer).toHaveBeenNthCalledWith(1, { verbose: false });
    expect(mockedCreateInteractiveRenderer).not.toHaveBeenCalled();
    expect(mockedCreatePlainRenderer).not.toHaveBeenCalled();
  });
});
