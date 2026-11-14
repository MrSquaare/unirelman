import { x } from "tinyexec";

export type RunProcessOptions = {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly exitCode?: number;
};

export type ProcessResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

const SUCCESS_EXIT_CODE = 0;

export const runProcess = async (
  command: string,
  args: readonly string[],
  options: RunProcessOptions,
): Promise<ProcessResult> => {
  const expectedExitCode = options.exitCode ?? SUCCESS_EXIT_CODE;
  const { exitCode, stdout, stderr } = await x(command, args, {
    nodePath: false,
    nodeOptions: { cwd: options.cwd, env: options.env },
  });

  if (exitCode !== expectedExitCode) {
    throw new Error(
      `Command "${[command, ...args].join(" ")}" exited with code ${exitCode} instead of ${expectedExitCode} in ${options.cwd}.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    );
  }

  return { exitCode, stdout, stderr };
};
