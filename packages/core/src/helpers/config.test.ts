import { mockedAssertSinglePhaseProviders } from "./phase.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CoreDuplicatePluginRegistrationError,
  CoreDuplicateScopeNameError,
  CoreDuplicateScopePathError,
  CoreEmptyConfigPluginScopeNameError,
  CoreEmptyConfigPluginScopesError,
  CoreEmptyScopeNameError,
  CoreEmptyScopesError,
  CoreInvalidConfigError,
  CoreReservedScopeNameError,
  CoreScopePathOutsideCwdError,
  CoreUnknownConfigPluginScopeError,
} from "../errors";
import {
  CONFIG_CWD,
  CONFIG_SCOPE_PATHS,
  createConfig,
  createConfigScopes,
  createResolvedConfig,
} from "../testing/fixtures/config";
import { PLUGIN_NAMES } from "../testing/fixtures/constants";
import { createPlugin } from "../testing/fixtures/plugin";
import { SCOPE_NAMES } from "../testing/fixtures/scope";
import * as thisMod from "./config";
import {
  parseConfig,
  isPathInside,
  resolveConfig,
  resolvePluginRegistration,
  resolvePluginRegistrations,
  resolveScopeMap,
} from "./config";

describe("parseConfig", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return config with plugin and scoped config plugins", () => {
    const plugin = createPlugin();
    const pluginB = createPlugin({ extends: { name: PLUGIN_NAMES.B } });
    const config = {
      scopes: createConfigScopes(),
      plugins: [plugin, { plugin: pluginB, scopes: [SCOPE_NAMES.ALPHA] }],
    };

    expect(parseConfig(config)).toEqual(config);
  });

  it("should throw when scopes are missing", () => {
    expect(() => parseConfig({ plugins: [] })).toThrow(
      new CoreInvalidConfigError(
        "✖ Invalid input: expected record, received undefined\n  → at scopes",
      ),
    );
  });

  it("should throw when a plugin is invalid", () => {
    expect(() =>
      parseConfig({ scopes: createConfigScopes(), plugins: [{ createReleases: () => undefined }] }),
    ).toThrow(new CoreInvalidConfigError("✖ Invalid input\n  → at plugins[0]"));
  });

  it("should throw when a scoped config plugin has an unknown key", () => {
    expect(() =>
      parseConfig({
        scopes: createConfigScopes(),
        plugins: [{ plugin: createPlugin(), scope: [SCOPE_NAMES.ALPHA] }],
      }),
    ).toThrow(new CoreInvalidConfigError('✖ Unrecognized key: "scope"\n  → at plugins[0]'));
  });

  it("should throw when config has an unknown key", () => {
    expect(() => parseConfig({ scopes: createConfigScopes(), plugins: [], extra: true })).toThrow(
      new CoreInvalidConfigError('✖ Unrecognized key: "extra"'),
    );
  });
});

describe("isPathInside", () => {
  it("should return true for a path inside the parent path", () => {
    expect(isPathInside(CONFIG_CWD, `${CONFIG_CWD}/packages/alpha`)).toEqual(true);
  });

  it("should return true for a folder whose name starts with two dots", () => {
    expect(isPathInside(CONFIG_CWD, `${CONFIG_CWD}/..alpha`)).toEqual(true);
  });

  it("should return true for the parent path itself", () => {
    expect(isPathInside(CONFIG_CWD, CONFIG_CWD)).toEqual(true);
  });

  it("should return false for the parent of the parent path", () => {
    expect(isPathInside(CONFIG_CWD, "/")).toEqual(false);
  });

  it("should return false for a sibling path", () => {
    expect(isPathInside(CONFIG_CWD, "/outside/alpha")).toEqual(false);
  });
});

describe("resolveScopeMap", () => {
  const isPathInsideSpy = vi.spyOn(thisMod, "isPathInside");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve config scopes with relative paths", () => {
    const scopes = createConfigScopes();

    expect(resolveScopeMap(CONFIG_CWD, scopes)).toEqual({
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
      [SCOPE_NAMES.BETA]: {
        name: SCOPE_NAMES.BETA,
        path: `${CONFIG_CWD}/packages/beta`,
        meta: {},
      },
    });

    expect(isPathInsideSpy).toHaveBeenCalledTimes(2);
    expect(isPathInsideSpy).toHaveBeenNthCalledWith(1, CONFIG_CWD, `${CONFIG_CWD}/packages/alpha`);
    expect(isPathInsideSpy).toHaveBeenNthCalledWith(2, CONFIG_CWD, `${CONFIG_CWD}/packages/beta`);
  });

  it("should trim scope names", () => {
    const scopes = {
      [` ${SCOPE_NAMES.ALPHA} `]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
    };

    expect(resolveScopeMap(CONFIG_CWD, scopes)).toEqual({
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
    });
  });

  it("should resolve config scopes when path is relative without leading dot", () => {
    const scopes = {
      [SCOPE_NAMES.ALPHA]: "packages/alpha",
    };

    expect(resolveScopeMap(CONFIG_CWD, scopes)).toEqual({
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
    });
  });

  it("should resolve config scopes when path is dot for root directory", () => {
    const scopes = {
      root: ".",
    };

    expect(resolveScopeMap(CONFIG_CWD, scopes)).toEqual({
      root: {
        name: "root",
        path: CONFIG_CWD,
        meta: {},
      },
    });
  });

  it("should resolve config scopes when path is already absolute", () => {
    const scopes = {
      [SCOPE_NAMES.ALPHA]: `${CONFIG_CWD}/packages/alpha`,
    };

    expect(resolveScopeMap(CONFIG_CWD, scopes)).toEqual({
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
    });
  });

  it("should throw error when scopes are empty", () => {
    expect(() => resolveScopeMap(CONFIG_CWD, {})).toThrow(new CoreEmptyScopesError());
  });

  it("should throw error for empty scope names", () => {
    const scopes = {
      " \n\t ": CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
    };

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(new CoreEmptyScopeNameError());
  });

  it("should throw error for a scope name that is a property of Object.prototype", () => {
    expect(() => resolveScopeMap(CONFIG_CWD, { constructor: "./packages/alpha" })).toThrow(
      new CoreReservedScopeNameError("constructor"),
    );
  });

  it("should throw error for an own __proto__ scope name", () => {
    const scopes: Record<string, string> = JSON.parse('{"__proto__": "./packages/alpha"}');

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(
      new CoreReservedScopeNameError("__proto__"),
    );
  });

  it("should throw error for a reserved scope name once trimmed", () => {
    expect(() => resolveScopeMap(CONFIG_CWD, { " toString ": "./packages/alpha" })).toThrow(
      new CoreReservedScopeNameError("toString"),
    );
  });

  it("should throw error for duplicate scope names", () => {
    const scopes = {
      [SCOPE_NAMES.ALPHA]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      [` ${SCOPE_NAMES.ALPHA} `]: "./packages/other",
    };

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(
      new CoreDuplicateScopeNameError(SCOPE_NAMES.ALPHA),
    );
  });

  it("should throw error for duplicate scope paths", () => {
    const scopes = {
      [SCOPE_NAMES.ALPHA]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      [SCOPE_NAMES.BETA]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
    };

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(
      new CoreDuplicateScopePathError(`${CONFIG_CWD}/packages/alpha`),
    );
  });

  it("should throw error for scope path outside of cwd", () => {
    const scopes = {
      Outside: "../outside",
    };

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(
      new CoreScopePathOutsideCwdError("/outside"),
    );
  });

  it("should throw error for absolute scope path outside of cwd", () => {
    const scopes = {
      Outside: "/outside",
    };

    expect(() => resolveScopeMap(CONFIG_CWD, scopes)).toThrow(
      new CoreScopePathOutsideCwdError("/outside"),
    );
  });
});

describe("resolvePluginRegistration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve plain plugin", () => {
    const plugin = createPlugin();

    expect(resolvePluginRegistration(plugin, new Set([SCOPE_NAMES.ALPHA]))).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    });
  });

  it("should resolve plain plugin with multiple scopes", () => {
    const plugin = createPlugin();

    expect(
      resolvePluginRegistration(plugin, new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])),
    ).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
    });
  });

  it("should resolve scoped config plugin", () => {
    const plugin = createPlugin();

    expect(
      resolvePluginRegistration(
        { plugin, scopes: [SCOPE_NAMES.ALPHA] },
        new Set([SCOPE_NAMES.ALPHA]),
      ),
    ).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    });
  });

  it("should resolve scoped config plugin with all scopes when config plugin scopes are absent", () => {
    const plugin = createPlugin();

    expect(resolvePluginRegistration({ plugin }, new Set([SCOPE_NAMES.ALPHA]))).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    });
  });

  it("should trim config plugin scope names", () => {
    const plugin = createPlugin();

    expect(
      resolvePluginRegistration(
        { plugin, scopes: [` ${SCOPE_NAMES.ALPHA} `] },
        new Set([SCOPE_NAMES.ALPHA]),
      ),
    ).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    });
  });

  it("should deduplicate config plugin scope names", () => {
    const plugin = createPlugin();

    expect(
      resolvePluginRegistration(
        { plugin, scopes: [SCOPE_NAMES.ALPHA, ` ${SCOPE_NAMES.ALPHA} `] },
        new Set([SCOPE_NAMES.ALPHA]),
      ),
    ).toEqual({
      plugin,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    });
  });

  it("should throw when config plugin scopes are empty", () => {
    const plugin = createPlugin();

    expect(() =>
      resolvePluginRegistration({ plugin, scopes: [] }, new Set([SCOPE_NAMES.ALPHA])),
    ).toThrow(new CoreEmptyConfigPluginScopesError(plugin.name));
  });

  it("should throw when config plugin scopes have an empty scope name", () => {
    const plugin = createPlugin();

    expect(() =>
      resolvePluginRegistration({ plugin, scopes: [" "] }, new Set([SCOPE_NAMES.ALPHA])),
    ).toThrow(new CoreEmptyConfigPluginScopeNameError(plugin.name));
  });

  it("should throw when config plugin scopes have an unknown scope name", () => {
    const plugin = createPlugin();

    expect(() =>
      resolvePluginRegistration(
        { plugin, scopes: [SCOPE_NAMES.MISSING] },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      ),
    ).toThrow(
      new CoreUnknownConfigPluginScopeError(plugin.name, SCOPE_NAMES.MISSING, [
        SCOPE_NAMES.ALPHA,
        SCOPE_NAMES.BETA,
      ]),
    );
  });
});

describe("resolvePluginRegistrations", () => {
  const resolvePluginRegistrationSpy = vi.spyOn(thisMod, "resolvePluginRegistration");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve each plugin entry", () => {
    const pluginA = createPlugin();
    const pluginB = createPlugin({ extends: { name: PLUGIN_NAMES.B } });
    const resolvedScopes = {
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
    };
    const pluginAResolvedEntry = {
      plugin: pluginA,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    };
    const pluginBResolvedEntry = {
      plugin: pluginB,
      scopes: new Set([SCOPE_NAMES.ALPHA]),
    };

    resolvePluginRegistrationSpy
      .mockReturnValueOnce(pluginAResolvedEntry)
      .mockReturnValueOnce(pluginBResolvedEntry);

    expect(resolvePluginRegistrations([pluginA, pluginB], resolvedScopes)).toEqual([
      pluginAResolvedEntry,
      pluginBResolvedEntry,
    ]);
    expect(resolvePluginRegistrationSpy).toHaveBeenCalledTimes(2);
    expect(resolvePluginRegistrationSpy).toHaveBeenNthCalledWith(
      1,
      pluginA,
      new Set([SCOPE_NAMES.ALPHA]),
    );
    expect(resolvePluginRegistrationSpy).toHaveBeenNthCalledWith(
      2,
      pluginB,
      new Set([SCOPE_NAMES.ALPHA]),
    );
  });

  it("should return empty array when plugins are empty", () => {
    expect(resolvePluginRegistrations([], {})).toEqual([]);
    expect(resolvePluginRegistrationSpy).not.toHaveBeenCalled();
  });

  it("should throw when a plugin is registered more than once", () => {
    const plugin = createPlugin();
    const resolvedScopes = {
      [SCOPE_NAMES.ALPHA]: {
        name: SCOPE_NAMES.ALPHA,
        path: `${CONFIG_CWD}/packages/alpha`,
        meta: {},
      },
    };

    expect(() =>
      resolvePluginRegistrations([plugin, { plugin, scopes: [SCOPE_NAMES.ALPHA] }], resolvedScopes),
    ).toThrow(new CoreDuplicatePluginRegistrationError(plugin.name));
    expect(resolvePluginRegistrationSpy).toHaveBeenCalledTimes(2);
    expect(resolvePluginRegistrationSpy).toHaveBeenNthCalledWith(
      1,
      plugin,
      new Set([SCOPE_NAMES.ALPHA]),
    );
    expect(resolvePluginRegistrationSpy).toHaveBeenNthCalledWith(
      2,
      { plugin, scopes: [SCOPE_NAMES.ALPHA] },
      new Set([SCOPE_NAMES.ALPHA]),
    );
  });
});

describe("resolveConfig", () => {
  const resolveScopeMapSpy = vi.spyOn(thisMod, "resolveScopeMap");
  const resolvePluginRegistrationsSpy = vi.spyOn(thisMod, "resolvePluginRegistrations");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve config using resolved scopes and plugins", () => {
    const inputConfig = createConfig();
    const resolvedConfig = createResolvedConfig();

    resolveScopeMapSpy.mockReturnValueOnce(resolvedConfig.scopes);
    resolvePluginRegistrationsSpy.mockReturnValueOnce(resolvedConfig.plugins);

    expect(resolveConfig(CONFIG_CWD, inputConfig)).toEqual(resolvedConfig);

    expect(resolveScopeMapSpy).toHaveBeenCalledTimes(1);
    expect(resolveScopeMapSpy).toHaveBeenNthCalledWith(1, CONFIG_CWD, inputConfig.scopes);
    expect(resolvePluginRegistrationsSpy).toHaveBeenCalledTimes(1);
    expect(resolvePluginRegistrationsSpy).toHaveBeenNthCalledWith(
      1,
      inputConfig.plugins,
      resolvedConfig.scopes,
    );
    expect(mockedAssertSinglePhaseProviders).toHaveBeenCalledTimes(1);
    expect(mockedAssertSinglePhaseProviders).toHaveBeenNthCalledWith(1, resolvedConfig.plugins);
  });
});
