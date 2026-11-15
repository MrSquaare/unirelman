import { vi } from "vitest";

import { filterScopeResultMap } from "./scope";

vi.mock("./scope", async (importActual) => {
  const actual = await importActual<typeof import("./scope")>();

  return {
    ...actual,
    filterScopeResultMap: vi.fn(actual.filterScopeResultMap),
  };
});

export const mockedFilterScopeResultMap = vi.mocked(filterScopeResultMap);
