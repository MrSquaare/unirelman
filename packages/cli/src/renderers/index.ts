import type { OutputMode, Renderer, TerminalState } from "../types/renderer";

import { createInteractiveRenderer } from "./interactive";
import { createJSONRenderer } from "./json";
import { createPlainRenderer } from "./plain";

export const readTerminalState = (): TerminalState => {
  return {
    stdin: process.stdin.isTTY === true,
    stderr: process.stderr.isTTY === true,
  };
};

export const resolveOutputMode = (
  requestedMode: OutputMode | undefined,
  terminal: TerminalState,
): OutputMode => {
  if (requestedMode !== undefined) {
    return requestedMode;
  }

  return terminal.stdin && terminal.stderr ? "interactive" : "plain";
};

export const createRenderer = (mode: OutputMode, verbose: boolean): Renderer => {
  if (mode === "json") {
    return createJSONRenderer({ verbose });
  }

  if (mode === "interactive") {
    return createInteractiveRenderer({ verbose });
  }

  return createPlainRenderer({ verbose });
};
