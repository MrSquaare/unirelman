import type { Hono } from "hono";

import { serve, type ServerType } from "@hono/node-server";

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
