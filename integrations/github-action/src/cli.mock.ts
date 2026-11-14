import { vi } from "vitest";

import { resolveUnirelmanEnvironment, runUnirelmanPublish, runUnirelmanVersion } from "./cli";

vi.mock("./cli", async (importActual) => {
  const actual = await importActual<typeof import("./cli")>();

  return {
    ...actual,
    resolveUnirelmanEnvironment: vi.fn(),
    runUnirelmanPublish: vi.fn(),
    runUnirelmanVersion: vi.fn(),
  };
});

export const mockedResolveUnirelmanEnvironment = vi.mocked(resolveUnirelmanEnvironment);
export const mockedRunUnirelmanPublish = vi.mocked(runUnirelmanPublish);
export const mockedRunUnirelmanVersion = vi.mocked(runUnirelmanVersion);
