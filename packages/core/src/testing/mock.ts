import { vi } from "vitest";

import {
  dedupeFileOperations,
  FS,
  createPluginContext,
  parseConfig,
  Pipeline,
  resolveConfig,
  Store,
} from "../index";

vi.mock("@unirelman/core", async (importActual) => {
  const actual = await importActual<typeof import("../index")>();
  const { MockFS, MockPipeline, MockStore } = await import("./mocks");

  return {
    ...actual,
    FS: MockFS,
    Pipeline: MockPipeline,
    Store: MockStore,
    dedupeFileOperations: vi.fn(actual.dedupeFileOperations),
    parseConfig: vi.fn(actual.parseConfig),
    resolveConfig: vi.fn(),
    createPluginContext: vi.fn(),
  };
});

export const MockedFS = vi.mocked(FS);
export const MockedPipeline = vi.mocked(Pipeline);
export const MockedStore = vi.mocked(Store);
export const mockedDedupeFileOperations = vi.mocked(dedupeFileOperations);
export const mockedParseConfig = vi.mocked(parseConfig);
export const mockedResolveConfig = vi.mocked(resolveConfig);
export const mockedCreatePluginContext = vi.mocked(createPluginContext);
