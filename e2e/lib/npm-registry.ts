import type { ServerType } from "@hono/node-server";

import { Hono } from "hono";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";

import { startMockServer, stopMockServer, stopMockServerAfterFailure } from "./mock-server.ts";

export type NpmPackage = {
  readonly distTags: Readonly<Record<string, string>>;
  readonly versions: readonly string[];
};

type NpmPackument = {
  readonly _id: string;
  readonly name: string;
  readonly "dist-tags": Readonly<Record<string, string>>;
  readonly versions: Readonly<Record<string, unknown>>;
};

type NpmRegistryState = {
  readonly packuments: Map<string, NpmPackument>;
  tokenRevoked: boolean;
};

const NPM_TOKEN = "e2e-npm-token";
const AUTHORIZATION = `Bearer ${NPM_TOKEN}`;
const USER_CONFIG_FILE_NAME = "npmrc";
const GLOBAL_CONFIG_FILE_NAME = "npmrc-global";
const CACHE_DIRECTORY_NAME = "npm-cache";

const manifestDependenciesSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
});

const publishBodySchema = z.object({
  name: z.string(),
  "dist-tags": z.record(z.string(), z.string()),
  versions: z.record(z.string(), z.unknown()),
});

const createNpmRegistryApp = (state: NpmRegistryState): Hono => {
  const app = new Hono();

  app.get("/:name", (c) => {
    const packument = state.packuments.get(c.req.param("name"));

    return packument ? c.json(packument) : c.json({ error: "Not found" }, 404);
  });

  app.put("/:name", async (c) => {
    if (state.tokenRevoked || c.req.header("authorization") !== AUTHORIZATION) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const input = publishBodySchema.parse(await c.req.json());
    const existing = state.packuments.get(input.name);
    const conflictingVersion = Object.keys(input.versions).find(
      (version) => existing?.versions[version] !== undefined,
    );

    if (conflictingVersion !== undefined) {
      return c.json(
        {
          error: `You cannot publish over the previously published version ${conflictingVersion}.`,
        },
        403,
      );
    }

    state.packuments.set(input.name, {
      _id: input.name,
      name: input.name,
      "dist-tags": { ...existing?.["dist-tags"], ...input["dist-tags"] },
      versions: { ...existing?.versions, ...input.versions },
    });

    return c.json({ ok: true }, 201);
  });

  app.notFound((c) =>
    c.json({ error: `Unhandled npm registry mock request: ${c.req.method} ${c.req.path}` }, 501),
  );
  app.onError((error, c) => c.json({ error: error.message }, 500));

  return app;
};

export class NpmRegistry {
  readonly environment: Readonly<Record<string, string>>;
  private readonly server: ServerType;
  private readonly state: NpmRegistryState;

  private constructor(
    environment: Readonly<Record<string, string>>,
    server: ServerType,
    state: NpmRegistryState,
  ) {
    this.environment = environment;
    this.server = server;
    this.state = state;
  }

  static async start(directory: string): Promise<NpmRegistry> {
    const state: NpmRegistryState = { packuments: new Map(), tokenRevoked: false };
    const { url, server } = await startMockServer(createNpmRegistryApp(state));
    const registryUrl = `${url}/`;
    const userConfigPath = join(directory, USER_CONFIG_FILE_NAME);
    const globalConfigPath = join(directory, GLOBAL_CONFIG_FILE_NAME);

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(
        userConfigPath,
        `registry=${registryUrl}\n${registryUrl.replace(/^http:/, "")}:_authToken=${NPM_TOKEN}\n`,
      );
      await writeFile(globalConfigPath, "");
    } catch (error) {
      return stopMockServerAfterFailure(server, error);
    }

    return new NpmRegistry(
      {
        NPM_CONFIG_USERCONFIG: userConfigPath,
        NPM_CONFIG_GLOBALCONFIG: globalConfigPath,
        NPM_CONFIG_REGISTRY: registryUrl,
        NPM_CONFIG_CACHE: join(directory, CACHE_DIRECTORY_NAME),
        NPM_CONFIG_UPDATE_NOTIFIER: "false",
      },
      server,
      state,
    );
  }

  revokeToken(): void {
    this.state.tokenRevoked = true;
  }

  restoreToken(): void {
    this.state.tokenRevoked = false;
  }

  readPackages(): Record<string, NpmPackage> {
    const packages: Record<string, NpmPackage> = {};

    for (const [name, packument] of [...this.state.packuments.entries()].sort()) {
      packages[name] = {
        distTags: { ...packument["dist-tags"] },
        versions: Object.keys(packument.versions),
      };
    }

    return packages;
  }

  readDependencies(name: string, version: string): Record<string, string> | undefined {
    const manifest = this.state.packuments.get(name)?.versions[version];

    if (manifest === undefined) {
      throw new Error(`Failed to read dependencies: ${name}@${version} is not published.`);
    }

    return manifestDependenciesSchema.parse(manifest).dependencies;
  }

  stop(): Promise<void> {
    return stopMockServer(this.server);
  }
}
