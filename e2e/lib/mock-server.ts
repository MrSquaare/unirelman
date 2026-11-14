import type { Hono } from "hono";

import { serve, type ServerType } from "@hono/node-server";
import { CleanupError } from "@unirelman/utils";

export type MockServer = {
  readonly url: string;
  readonly server: ServerType;
};

const HOST = "127.0.0.1";

export const startMockServer = (app: Hono): Promise<MockServer> => {
  return new Promise((resolveServer) => {
    const server = serve({ fetch: app.fetch, hostname: HOST, port: 0 }, (info) =>
      resolveServer({ url: `http://${HOST}:${info.port}`, server }),
    );
  });
};

export const stopMockServer = (server: ServerType): Promise<void> => {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
};

export const stopMockServerAfterFailure = async (
  server: ServerType,
  error: unknown,
): Promise<never> => {
  try {
    await stopMockServer(server);
  } catch (stopError) {
    throw new CleanupError(error, stopError);
  }

  throw error;
};
