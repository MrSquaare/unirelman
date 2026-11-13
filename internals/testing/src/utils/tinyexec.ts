import { ExecProcess, type Output } from "tinyexec";

class CompletedExecProcess extends ExecProcess {
  readonly #resolveOutput: () => Promise<Output>;
  readonly #signalCode: string | null;

  constructor(resolveOutput: () => Promise<Output>, signalCode: string | null = null) {
    super("completed-exec-process");

    this.#resolveOutput = resolveOutput;
    this.#signalCode = signalCode;
  }

  override get signalCode(): string | null {
    return this.#signalCode;
  }

  protected override _waitForOutput(): Promise<Output> {
    return this.#resolveOutput();
  }
}

export const createExecResult = (output: Output, signalCode: string | null = null): ExecProcess => {
  return new CompletedExecProcess(async () => output, signalCode);
};

export const createFailedExecResult = (reason: unknown): ExecProcess => {
  return new CompletedExecProcess(async () => {
    throw reason;
  });
};
