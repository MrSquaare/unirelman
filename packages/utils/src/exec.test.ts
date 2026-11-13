import { mockedX } from "@unirelman/testing/mocks/tinyexec";
import { createExecResult, createFailedExecResult } from "@unirelman/testing/utils/tinyexec";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./exec";
import { execCommand, ExecError, ExecSpawnError, formatCommand } from "./exec";

const CONFIG_CWD = "/repo";

describe("formatCommand", () => {
  it("should join command and arguments with spaces", () => {
    expect(formatCommand("git", ["commit", "-m", "message"])).toEqual("git commit -m message");
  });

  it("should return command alone when there are no arguments", () => {
    expect(formatCommand("git", [])).toEqual("git");
  });
});

describe("ExecError", () => {
  describe("constructor", () => {
    const formatCommandSpy = vi.spyOn(thisMod, "formatCommand");

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct ExecError with exit code summary message", () => {
      const error = new ExecError({
        command: "git",
        args: ["commit", "-m", "message"],
        cwd: CONFIG_CWD,
        exitCode: 1,
        signal: undefined,
        stdout: "out",
        stderr: "err",
      });

      expect(error).toEqual(
        Object.assign(
          new Error(`Command "git commit -m message" failed with exit code 1 in ${CONFIG_CWD}`),
          {
            name: "ExecError",
            command: "git",
            args: ["commit", "-m", "message"],
            cwd: CONFIG_CWD,
            exitCode: 1,
            signal: undefined,
            stdout: "out",
            stderr: "err",
          },
        ),
      );
      expect(formatCommandSpy).toHaveBeenCalledTimes(1);
      expect(formatCommandSpy).toHaveBeenNthCalledWith(1, "git", ["commit", "-m", "message"]);
    });

    it("should construct ExecError with signal summary message when exit code is undefined", () => {
      const error = new ExecError({
        command: "git",
        args: ["commit"],
        cwd: CONFIG_CWD,
        exitCode: undefined,
        signal: "SIGTERM",
        stdout: "out",
        stderr: "err",
      });

      expect(error).toEqual(
        Object.assign(
          new Error(`Command "git commit" was terminated by signal SIGTERM in ${CONFIG_CWD}`),
          {
            name: "ExecError",
            command: "git",
            args: ["commit"],
            cwd: CONFIG_CWD,
            exitCode: undefined,
            signal: "SIGTERM",
            stdout: "out",
            stderr: "err",
          },
        ),
      );
    });
  });
});

describe("ExecSpawnError", () => {
  describe("constructor", () => {
    const formatCommandSpy = vi.spyOn(thisMod, "formatCommand");

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct ExecSpawnError with message and cause", () => {
      const cause = new Error("spawn git ENOENT");
      const error = new ExecSpawnError({
        command: "git",
        args: ["status"],
        cwd: CONFIG_CWD,
        cause,
      });

      expect(error).toEqual(
        Object.assign(
          new Error(`Failed to start command "git status" in ${CONFIG_CWD}: spawn git ENOENT`),
          {
            name: "ExecSpawnError",
            command: "git",
            args: ["status"],
            cwd: CONFIG_CWD,
          },
        ),
      );
      expect(error.cause).toEqual(cause);
      expect(formatCommandSpy).toHaveBeenCalledTimes(1);
      expect(formatCommandSpy).toHaveBeenNthCalledWith(1, "git", ["status"]);
    });
  });
});

describe("execCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should execute command and return output", async () => {
    mockedX.mockReturnValueOnce(
      createExecResult({ exitCode: 0, stdout: "output line\n", stderr: "" }),
    );

    await expect(execCommand("echo", ["hello"], { cwd: CONFIG_CWD })).resolves.toEqual({
      exitCode: 0,
      stdout: "output line\n",
      stderr: "",
    });

    expect(mockedX).toHaveBeenCalledTimes(1);
    expect(mockedX).toHaveBeenNthCalledWith(1, "echo", ["hello"], {
      nodePath: false,
      nodeOptions: { cwd: CONFIG_CWD, stdio: ["ignore", "pipe", "pipe"] },
    });
  });

  it("should return output when exit code is allowed", async () => {
    mockedX.mockReturnValueOnce(createExecResult({ exitCode: 1, stdout: "", stderr: "" }));

    await expect(
      execCommand("git", ["diff", "--quiet"], { cwd: CONFIG_CWD, allowedExitCodes: [0, 1] }),
    ).resolves.toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "",
    });

    expect(mockedX).toHaveBeenCalledTimes(1);
    expect(mockedX).toHaveBeenNthCalledWith(1, "git", ["diff", "--quiet"], {
      nodePath: false,
      nodeOptions: { cwd: CONFIG_CWD, stdio: ["ignore", "pipe", "pipe"] },
    });
  });

  it("should throw ExecSpawnError when command cannot be started", async () => {
    const cause = new Error("spawn missing ENOENT");

    mockedX.mockReturnValueOnce(createFailedExecResult(cause));

    await expect(execCommand("missing", [], { cwd: CONFIG_CWD })).rejects.toThrow(
      new ExecSpawnError({ command: "missing", args: [], cwd: CONFIG_CWD, cause }),
    );
  });

  it("should throw ExecError when command exits with non-zero code", async () => {
    mockedX.mockReturnValueOnce(
      createExecResult({ exitCode: 1, stdout: "std output", stderr: "err output" }),
    );

    await expect(execCommand("ls", ["nonexistent"], { cwd: CONFIG_CWD })).rejects.toThrow(
      new ExecError({
        command: "ls",
        args: ["nonexistent"],
        cwd: CONFIG_CWD,
        exitCode: 1,
        signal: undefined,
        stdout: "std output",
        stderr: "err output",
      }),
    );
  });

  it("should throw ExecError when exit code is not in allowed exit codes", async () => {
    mockedX.mockReturnValueOnce(
      createExecResult({ exitCode: 128, stdout: "", stderr: "fatal error" }),
    );

    await expect(
      execCommand("git", ["diff", "--quiet"], { cwd: CONFIG_CWD, allowedExitCodes: [0, 1] }),
    ).rejects.toThrow(
      new ExecError({
        command: "git",
        args: ["diff", "--quiet"],
        cwd: CONFIG_CWD,
        exitCode: 128,
        signal: undefined,
        stdout: "",
        stderr: "fatal error",
      }),
    );
  });

  it("should throw ExecError when command is terminated by a signal even if exit codes are allowed", async () => {
    mockedX.mockReturnValueOnce(
      createExecResult({ exitCode: undefined, stdout: "partial", stderr: "" }, "SIGKILL"),
    );

    await expect(
      execCommand("sleep", ["10"], { cwd: CONFIG_CWD, allowedExitCodes: [0, 1] }),
    ).rejects.toThrow(
      new ExecError({
        command: "sleep",
        args: ["10"],
        cwd: CONFIG_CWD,
        exitCode: undefined,
        signal: "SIGKILL",
        stdout: "partial",
        stderr: "",
      }),
    );
  });

  it("should rethrow a rejection that is not an Error unchanged", async () => {
    const rejection = "unexpected rejection";

    mockedX.mockReturnValueOnce(createFailedExecResult(rejection));

    await expect(execCommand("git", ["status"], { cwd: CONFIG_CWD })).rejects.toEqual(rejection);
  });
});
