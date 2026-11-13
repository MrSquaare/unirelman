import { vi } from "vitest";

import { Store } from ".";

vi.mock(".", async (importActual) => {
  const actual = await importActual<typeof import(".")>();
  const { MockStore } = await import("../testing/mocks/store");

  return {
    ...actual,
    Store: MockStore,
  };
});

export const MockedStore = vi.mocked(Store);
