import { MockedStore } from "@unirelman/core/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readActionSettings, resolveActionSettingsPath, writeActionSettings } from "./settings";
import { actionSettingsSchema } from "./types";

describe("resolveActionSettingsPath", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the settings file path inside the store", () => {
    const store = new MockedStore(".");

    vi.mocked(store.resolvePath).mockReturnValueOnce(
      "/workspace/.unirelman/github-action/settings.json",
    );

    expect(resolveActionSettingsPath(store)).toEqual(
      "/workspace/.unirelman/github-action/settings.json",
    );
    expect(store.resolvePath).toHaveBeenCalledTimes(1);
    expect(store.resolvePath).toHaveBeenNthCalledWith(1, "settings.json");
  });
});

describe("readActionSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read the settings file with publishing disabled when it is missing", async () => {
    const store = new MockedStore(".");

    vi.mocked(store.readJSON).mockResolvedValueOnce({ publishingEnabled: true });

    await expect(readActionSettings(store)).resolves.toEqual({ publishingEnabled: true });
    expect(store.readJSON).toHaveBeenCalledTimes(1);
    expect(store.readJSON).toHaveBeenNthCalledWith(1, "settings.json", actionSettingsSchema, {
      publishingEnabled: false,
    });
  });
});

describe("writeActionSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should write the settings file", async () => {
    const store = new MockedStore(".");

    await expect(writeActionSettings(store, { publishingEnabled: true })).resolves.toEqual(
      undefined,
    );
    expect(store.writeJSON).toHaveBeenCalledTimes(1);
    expect(store.writeJSON).toHaveBeenNthCalledWith(1, "settings.json", {
      publishingEnabled: true,
    });
  });
});
