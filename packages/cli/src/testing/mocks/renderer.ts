import { vi, type Mocked } from "vitest";

import type { Renderer } from "../../types/renderer";

import { MockCommandUI } from "./ui";

export const MockRenderer = vi.fn<new () => Mocked<Renderer>>(
  class {
    ui = new MockCommandUI();
    createLogger = vi.fn();
    print = vi.fn();
    printError = vi.fn();
    intro = vi.fn();
    result = vi.fn();
    success = vi.fn();
    cancel = vi.fn();
    error = vi.fn();
    failure = vi.fn();
  },
);
