import { vi } from "vitest";

import { assertKnownScopes, parseChangesetFile, serializeChangeset } from "./changeset";

vi.mock("./changeset", async (importActual) => {
  const actual = await importActual<typeof import("./changeset")>();

  return {
    ...actual,
    assertKnownScopes: vi.fn(actual.assertKnownScopes),
    parseChangesetFile: vi.fn(actual.parseChangesetFile),
    serializeChangeset: vi.fn(actual.serializeChangeset),
  };
});

export const mockedAssertKnownScopes = vi.mocked(assertKnownScopes);
export const mockedParseChangesetFile = vi.mocked(parseChangesetFile);
export const mockedSerializeChangeset = vi.mocked(serializeChangeset);
