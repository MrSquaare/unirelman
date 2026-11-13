import type { MockedClass } from "@unirelman/testing/utils/mock";

import { vi, type Mock } from "vitest";

import type { Pipeline } from "../../pipeline";

export const MockPipeline = vi.fn<MockedClass<Pipeline>>(
  class {
    run = vi.fn().mockResolvedValue(undefined);
  },
) as unknown as Mock<typeof Pipeline>;
