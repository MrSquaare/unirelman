import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveCommandEnvironment } from "./env";

describe("resolveCommandEnvironment", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should merge the overrides over the defined environment variables", () => {
    expect(
      resolveCommandEnvironment(
        { PATH: "/usr/bin", GITHUB_TOKEN: "old-token", EMPTY: undefined },
        { GITHUB_TOKEN: "token" },
      ),
    ).toEqual({ PATH: "/usr/bin", GITHUB_TOKEN: "token" });
  });

  it("should keep a variable named __proto__ as an own variable", () => {
    const environment: Record<string, string> = JSON.parse('{"__proto__": "value"}');

    expect(Object.entries(resolveCommandEnvironment(environment, {}))).toEqual([
      ["__proto__", "value"],
    ]);
  });
});
