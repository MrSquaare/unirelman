import { vi, type Mocked } from "vitest";

import type { CreateLogger, Logger } from "../../types/logger";

export const MockLogger = vi.fn<new () => Mocked<Logger>>(
  class {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
  },
);

export const mockCreateLogger = vi.fn<CreateLogger>(() => new MockLogger());
