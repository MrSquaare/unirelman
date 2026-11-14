import { vi } from "vitest";

import { parseLevel, parseMessage, parseScopes } from "./fields";

vi.mock("./fields", async (importActual) => {
  const actual = await importActual<typeof import("./fields")>();

  return {
    ...actual,
    parseScopes: vi.fn(actual.parseScopes),
    parseLevel: vi.fn(actual.parseLevel),
    parseMessage: vi.fn(actual.parseMessage),
  };
});

export const mockedParseScopes = vi.mocked(parseScopes);
export const mockedParseLevel = vi.mocked(parseLevel);
export const mockedParseMessage = vi.mocked(parseMessage);
