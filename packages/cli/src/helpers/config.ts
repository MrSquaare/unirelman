import { parseConfig, resolveConfig } from "@unirelman/core";
import { loadConfig as c12LoadConfig } from "c12";
import { basename, dirname, resolve } from "node:path";

import * as thisMod from "./config";

export const loadConfig = async (path?: string) => {
  const resolvedPath = path ? resolve(path) : undefined;
  const cwd = resolvedPath ? dirname(resolvedPath) : resolve(process.cwd());
  const configFile = resolvedPath ? basename(resolvedPath) : undefined;

  const { config } = await c12LoadConfig({
    name: "unirelman",
    cwd,
    configFile,
    configFileRequired: true,
  });

  return { cwd, config: parseConfig(config) };
};

export const loadResolvedConfig = async (path?: string) => {
  const { cwd, config } = await thisMod.loadConfig(path);

  const resolvedConfig = resolveConfig(cwd, config);

  return { cwd, config: resolvedConfig };
};
