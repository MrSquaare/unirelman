import { vi, type Mocked } from "vitest";

import type { CommandUI } from "../../types/renderer";

export const MockCommandUI = vi.fn<new () => Mocked<CommandUI>>(
  class {
    progress = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    select = vi.fn();
    multiselect = vi.fn();
    text = vi.fn();
  },
);
