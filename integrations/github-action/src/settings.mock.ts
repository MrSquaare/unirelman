import { vi } from "vitest";

import { readActionSettings, resolveActionSettingsPath, writeActionSettings } from "./settings";

vi.mock("./settings", async (importActual) => {
  const actual = await importActual<typeof import("./settings")>();

  return {
    ...actual,
    readActionSettings: vi.fn(),
    resolveActionSettingsPath: vi.fn(),
    writeActionSettings: vi.fn(),
  };
});

export const mockedReadActionSettings = vi.mocked(readActionSettings);
export const mockedResolveActionSettingsPath = vi.mocked(resolveActionSettingsPath);
export const mockedWriteActionSettings = vi.mocked(writeActionSettings);
