import { afterEach, describe, expect, it, vi } from "vitest";

import { writeError, writeJSON, writeOutput } from "./stream";

describe("writeOutput", () => {
  const stdoutWriteSpy = vi.spyOn(process.stdout, "write");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write text with a trailing newline to standard output", () => {
    stdoutWriteSpy.mockReturnValueOnce(true);

    writeOutput("1.2.3");

    expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
    expect(stdoutWriteSpy).toHaveBeenNthCalledWith(1, "1.2.3\n");
  });
});

describe("writeError", () => {
  const stderrWriteSpy = vi.spyOn(process.stderr, "write");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write text with a trailing newline to standard error", () => {
    stderrWriteSpy.mockReturnValueOnce(true);

    writeError("message");

    expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
    expect(stderrWriteSpy).toHaveBeenNthCalledWith(1, "message\n");
  });
});

describe("writeJSON", () => {
  const stdoutWriteSpy = vi.spyOn(process.stdout, "write");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write the value as indented JSON with a trailing newline to standard output", () => {
    stdoutWriteSpy.mockReturnValueOnce(true);

    writeJSON({ path: "a.md", scopes: ["root"] });

    expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
    expect(stdoutWriteSpy).toHaveBeenNthCalledWith(
      1,
      '{\n  "path": "a.md",\n  "scopes": [\n    "root"\n  ]\n}\n',
    );
  });

  it("should write nothing when the value is undefined", () => {
    writeJSON(undefined);

    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });
});
