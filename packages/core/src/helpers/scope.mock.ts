import { vi } from "vitest";

import { filterScopeMap, filterScopeResultMap } from "./scope";

vi.mock("./scope", async (importActual) => {
  const actual = await importActual<typeof import("./scope")>();

  return {
    ...actual,
    filterScopeMap: vi.fn(actual.filterScopeMap),
    filterScopeResultMap: vi.fn(actual.filterScopeResultMap),
  };
});

export const mockedFilterScopeMap = vi.mocked(filterScopeMap);
export const mockedFilterScopeResultMap = vi.mocked(filterScopeResultMap);
