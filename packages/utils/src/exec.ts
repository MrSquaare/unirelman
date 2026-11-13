import type { StdioOptions } from "node:child_process";

import { x, type Output } from "tinyexec";

import * as thisMod from "./exec";

const DEFAULT_ALLOWED_EXIT_CODES = [0] as const;
const CHILD_PROCESS_STDIO = ["ignore", "pipe", "pipe"] satisfies StdioOptions;

export type ExecCommandOptions = {
  readonly cwd: string;
  readonly allowedExitCodes?: readonly [number, ...number[]];
};

export type ExecCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type ExecErrorOptions = {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly exitCode: number | undefined;
  readonly signal: string | undefined;
  readonly stdout: string;
  readonly stderr: string;
};

export type ExecSpawnErrorOptions = {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly cause: Error;
};

export const formatCommand = (command: string, args: ReadonlyArray<string>): string => {
  return [command, ...args].join(" ").trim();
};

export class ExecError extends Error {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly exitCode: number | undefined;
  readonly signal: string | undefined;
  readonly stdout: string;
  readonly stderr: string;

  constructor(options: ExecErrorOptions) {
    const fullCommand = thisMod.formatCommand(options.command, options.args);
    const reason =
      options.exitCode === undefined
        ? `was terminated by signal ${String(options.signal)}`
        : `failed with exit code ${options.exitCode}`;

    super(`Command "${fullCommand}" ${reason} in ${options.cwd}`);

    this.name = "ExecError";
    this.command = options.command;
    this.args = options.args;
    this.cwd = options.cwd;
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}

export class ExecSpawnError extends Error {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;

  constructor(options: ExecSpawnErrorOptions) {
    const fullCommand = thisMod.formatCommand(options.command, options.args);

    super(`Failed to start command "${fullCommand}" in ${options.cwd}: ${options.cause.message}`, {
      cause: options.cause,
    });

    this.name = "ExecSpawnError";
    this.command = options.command;
    this.args = options.args;
    this.cwd = options.cwd;
  }
}

export const execCommand = async (
  command: string,
  args: ReadonlyArray<string>,
  options: ExecCommandOptions,
): Promise<ExecCommandResult> => {
  const { cwd, allowedExitCodes = DEFAULT_ALLOWED_EXIT_CODES } = options;
  let childProcess: ReturnType<typeof x>;
  let output: Output;

  try {
    childProcess = x(command, args, {
      nodePath: false,
      nodeOptions: { cwd, stdio: CHILD_PROCESS_STDIO },
    });
    output = await childProcess;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new ExecSpawnError({ command, args, cwd, cause: error });
  }

  if (output.exitCode === undefined || !allowedExitCodes.includes(output.exitCode)) {
    throw new ExecError({
      command,
      args,
      cwd,
      exitCode: output.exitCode,
      signal: childProcess.signalCode ?? undefined,
      stdout: output.stdout,
      stderr: output.stderr,
    });
  }

  return {
    exitCode: output.exitCode,
    stdout: output.stdout,
    stderr: output.stderr,
  };
};
