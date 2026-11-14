import { MockedFS } from "../fs/index.mock";
import { mockedFilterScopeMap } from "../helpers/scope.mock";
import { MockedStore } from "../store/index.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CONFIG_CWD } from "../testing/fixtures/config";
import { createPlugin, createPluginRegistration } from "../testing/fixtures/plugin";
import { SCOPE_NAMES, createScopeMap } from "../testing/fixtures/scope";
import { MockLogger, mockCreateLogger } from "../testing/mocks/logger";
import { createPluginContext, isPlugin } from "./plugin";

describe("isPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for plugin with name and phase functions", () => {
    expect(isPlugin(createPlugin())).toEqual(true);
  });

  it("should return true for plugin with name only", () => {
    expect(isPlugin({ name: "plugin-a" })).toEqual(true);
  });

  it("should return false for non-object value", () => {
    expect(isPlugin("plugin-a")).toEqual(false);
  });

  it("should return false for null value", () => {
    expect(isPlugin(null)).toEqual(false);
  });

  it("should return false when name is missing", () => {
    expect(isPlugin({ createReleases: () => undefined })).toEqual(false);
  });

  it("should return false when name is not a string", () => {
    expect(isPlugin({ name: 1 })).toEqual(false);
  });

  it("should return false when name is blank", () => {
    expect(isPlugin({ name: "  " })).toEqual(false);
  });

  it("should return false when a phase is not a function", () => {
    expect(isPlugin({ name: "plugin-a", createReleases: "npm publish" })).toEqual(false);
  });
});

describe("createPluginContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return plugin context with filtered scopes, logger, and store", () => {
    const scopeMap = createScopeMap();
    const pluginRegistration = createPluginRegistration({
      extends: { scopes: new Set([SCOPE_NAMES.ALPHA]) },
    });

    const logger = new MockLogger();

    mockCreateLogger.mockReturnValueOnce(logger);

    expect(
      createPluginContext({
        pluginRegistration,
        cwd: CONFIG_CWD,
        scopes: scopeMap,
        createLogger: mockCreateLogger,
      }),
    ).toEqual({
      cwd: CONFIG_CWD,
      scopes: { [SCOPE_NAMES.ALPHA]: scopeMap[SCOPE_NAMES.ALPHA] },
      logger,
      fs: MockedFS.mock.instances[0],
      store: MockedStore.mock.instances[0],
    });

    expect(mockedFilterScopeMap).toHaveBeenCalledTimes(1);
    expect(mockedFilterScopeMap).toHaveBeenNthCalledWith(1, scopeMap, pluginRegistration.scopes);
    expect(MockedFS).toHaveBeenCalledTimes(1);
    expect(MockedFS).toHaveBeenNthCalledWith(1, CONFIG_CWD);
    expect(mockCreateLogger).toHaveBeenCalledTimes(1);
    expect(mockCreateLogger).toHaveBeenNthCalledWith(1, pluginRegistration.plugin.name);
    expect(MockedStore).toHaveBeenCalledTimes(1);
    expect(MockedStore).toHaveBeenNthCalledWith(1, CONFIG_CWD, pluginRegistration.plugin.name);
  });

  it("should keep all scopes when plugin uses all scope names", () => {
    const scopeMap = createScopeMap();
    const pluginRegistration = createPluginRegistration();

    const logger = new MockLogger();

    mockCreateLogger.mockReturnValueOnce(logger);

    expect(
      createPluginContext({
        pluginRegistration,
        cwd: CONFIG_CWD,
        scopes: scopeMap,
        createLogger: mockCreateLogger,
      }),
    ).toEqual({
      cwd: CONFIG_CWD,
      scopes: scopeMap,
      logger,
      fs: MockedFS.mock.instances[0],
      store: MockedStore.mock.instances[0],
    });

    expect(mockedFilterScopeMap).toHaveBeenCalledTimes(1);
    expect(mockedFilterScopeMap).toHaveBeenNthCalledWith(1, scopeMap, pluginRegistration.scopes);
    expect(MockedFS).toHaveBeenCalledTimes(1);
    expect(MockedFS).toHaveBeenNthCalledWith(1, CONFIG_CWD);
    expect(mockCreateLogger).toHaveBeenCalledTimes(1);
    expect(mockCreateLogger).toHaveBeenNthCalledWith(1, pluginRegistration.plugin.name);
    expect(MockedStore).toHaveBeenCalledTimes(1);
    expect(MockedStore).toHaveBeenNthCalledWith(1, CONFIG_CWD, pluginRegistration.plugin.name);
  });
});
