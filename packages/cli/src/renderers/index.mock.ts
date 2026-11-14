import { vi } from "vitest";

import { createRenderer, readTerminalState, resolveOutputMode } from ".";

vi.mock(".", async (importActual) => {
  const actual = await importActual<typeof import(".")>();

  return {
    ...actual,
    createRenderer: vi.fn(),
    readTerminalState: vi.fn(),
    resolveOutputMode: vi.fn(actual.resolveOutputMode),
  };
});

export const mockedCreateRenderer = vi.mocked(createRenderer);
export const mockedReadTerminalState = vi.mocked(readTerminalState);
export const mockedResolveOutputMode = vi.mocked(resolveOutputMode);
