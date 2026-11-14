import type { MockedClass } from "@unirelman/testing/utils/mock";

import { vi, type Mock } from "vitest";

import type { Store } from "../../store";

export const MockStore = vi.fn<MockedClass<Store>>(
  class {
    list = vi.fn().mockResolvedValue([]);
    resolvePath = vi.fn();
    exists = vi.fn().mockResolvedValue(false);
    read = vi.fn().mockResolvedValue("");
    readJSON = vi.fn();
    readAll = vi.fn().mockResolvedValue([]);
    write = vi.fn().mockResolvedValue(undefined);
    writeJSON = vi.fn().mockResolvedValue(undefined);
    delete = vi.fn().mockResolvedValue(undefined);
    deleteAll = vi.fn().mockResolvedValue(undefined);
  },
) as unknown as Mock<typeof Store>;
