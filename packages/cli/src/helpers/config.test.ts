import { CONFIG_CWD, createConfig, createResolvedConfig } from "@unirelman/core/testing/fixtures";
import { mockedParseConfig, mockedResolveConfig } from "@unirelman/core/testing/mock";
import { mockedLoadConfig } from "@unirelman/testing/mocks/c12";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig, loadResolvedConfig } from "./config";
import * as thisMod from "./config";

describe("loadConfig", () => {
  const processCwdSpy = vi.spyOn(process, "cwd");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should load config from process cwd when no path is provided", async () => {
    const config = createConfig();

    processCwdSpy.mockReturnValueOnce(CONFIG_CWD);

    mockedLoadConfig.mockResolvedValueOnce({
      config,
      cwd: CONFIG_CWD,
      layers: [],
      source: `${CONFIG_CWD}/unirelman.config.ts`,
      configFile: `${CONFIG_CWD}/unirelman.config.ts`,
    });

    await expect(loadConfig()).resolves.toEqual({ cwd: CONFIG_CWD, config });
    expect(processCwdSpy).toHaveBeenCalledTimes(1);
    expect(processCwdSpy).toHaveBeenNthCalledWith(1);
    expect(mockedLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadConfig).toHaveBeenNthCalledWith(1, {
      name: "unirelman",
      cwd: CONFIG_CWD,
      configFile: undefined,
      configFileRequired: true,
    });
    expect(mockedParseConfig).toHaveBeenCalledTimes(1);
    expect(mockedParseConfig).toHaveBeenNthCalledWith(1, config);
  });

  it("should load config from explicit config path", async () => {
    const config = createConfig();
    const configPath = `${CONFIG_CWD}/custom.config.ts`;

    mockedLoadConfig.mockResolvedValueOnce({
      config,
      cwd: CONFIG_CWD,
      layers: [],
      source: configPath,
      configFile: configPath,
    });

    await expect(loadConfig(configPath)).resolves.toEqual({ cwd: CONFIG_CWD, config });
    expect(mockedLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadConfig).toHaveBeenNthCalledWith(1, {
      name: "unirelman",
      cwd: CONFIG_CWD,
      configFile: "custom.config.ts",
      configFileRequired: true,
    });
    expect(mockedParseConfig).toHaveBeenCalledTimes(1);
    expect(mockedParseConfig).toHaveBeenNthCalledWith(1, config);
  });

  it("should normalize relative config path to absolute cwd", async () => {
    const config = createConfig();

    processCwdSpy.mockReturnValueOnce(CONFIG_CWD);
    mockedLoadConfig.mockResolvedValueOnce({
      config,
      cwd: CONFIG_CWD,
      layers: [],
      source: `${CONFIG_CWD}/configs/local.config.ts`,
      configFile: `${CONFIG_CWD}/configs/local.config.ts`,
    });

    await expect(loadConfig("./configs/local.config.ts")).resolves.toEqual({
      cwd: `${CONFIG_CWD}/configs`,
      config,
    });
    expect(mockedLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadConfig).toHaveBeenNthCalledWith(1, {
      name: "unirelman",
      cwd: `${CONFIG_CWD}/configs`,
      configFile: "local.config.ts",
      configFileRequired: true,
    });
    expect(mockedParseConfig).toHaveBeenCalledTimes(1);
    expect(mockedParseConfig).toHaveBeenNthCalledWith(1, config);
  });

  it("should throw error when c12 loadConfig fails", async () => {
    const error = new Error("Config file not found");
    const configPath = `${CONFIG_CWD}/unirelman.config.ts`;

    mockedLoadConfig.mockRejectedValueOnce(error);

    await expect(loadConfig(configPath)).rejects.toThrow(error);
    expect(mockedLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadConfig).toHaveBeenNthCalledWith(1, {
      name: "unirelman",
      cwd: CONFIG_CWD,
      configFile: "unirelman.config.ts",
      configFileRequired: true,
    });
    expect(mockedParseConfig).not.toHaveBeenCalled();
  });
});

describe("loadResolvedConfig", () => {
  const loadConfigSpy = vi.spyOn(thisMod, "loadConfig");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should load and resolve config", async () => {
    const config = createConfig();
    const resolvedConfig = createResolvedConfig();
    const configPath = `${CONFIG_CWD}/unirelman.config.ts`;

    loadConfigSpy.mockResolvedValueOnce({
      config,
      cwd: CONFIG_CWD,
    });
    mockedResolveConfig.mockReturnValueOnce(resolvedConfig);

    await expect(loadResolvedConfig(configPath)).resolves.toEqual({
      cwd: CONFIG_CWD,
      config: resolvedConfig,
    });
    expect(loadConfigSpy).toHaveBeenCalledTimes(1);
    expect(loadConfigSpy).toHaveBeenNthCalledWith(1, configPath);
    expect(mockedResolveConfig).toHaveBeenCalledTimes(1);
    expect(mockedResolveConfig).toHaveBeenNthCalledWith(1, CONFIG_CWD, config);
  });

  it("should throw error when loadConfig fails", async () => {
    const error = new Error("Failed to load config");
    const configPath = `${CONFIG_CWD}/unirelman.config.ts`;

    loadConfigSpy.mockRejectedValueOnce(error);

    await expect(loadResolvedConfig(configPath)).rejects.toThrow(error);
    expect(loadConfigSpy).toHaveBeenCalledTimes(1);
    expect(loadConfigSpy).toHaveBeenNthCalledWith(1, configPath);
    expect(mockedResolveConfig).not.toHaveBeenCalled();
  });
});
