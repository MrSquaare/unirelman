import type { ServerType } from "@hono/node-server";

import { Hono } from "hono";
import * as z from "zod";

import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from "./constants.ts";
import { startMockServer, stopMockServer } from "./mock-server.ts";

export type GitHubRelease = {
  readonly id: number;
  readonly tag_name: string;
  readonly name: string;
  readonly target_commitish: string;
  readonly body: string;
  readonly prerelease: boolean;
  readonly draft: boolean;
  readonly make_latest: "true" | "false" | "legacy";
  readonly html_url: string;
  readonly upload_url: string;
};

export type GitHubPullRequest = {
  readonly number: number;
  readonly head: string;
  readonly base: string;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
};

type GitHubState = {
  readonly releases: GitHubRelease[];
  readonly pullRequests: GitHubPullRequest[];
};

const AUTHORIZATION = `token ${GITHUB_TOKEN}`;
const REPOSITORY_PATH = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const NOT_FOUND_BODY = { message: "Not Found" };

const createReleaseBodySchema = z.object({
  tag_name: z.string(),
  name: z.string(),
  target_commitish: z.string(),
  body: z.string(),
  prerelease: z.boolean(),
  draft: z.boolean(),
  make_latest: z.enum(["true", "false", "legacy"]),
});

const createPullRequestBodySchema = z.object({
  head: z.string(),
  base: z.string(),
  title: z.string(),
  body: z.string(),
});

const updatePullRequestBodySchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
});

const createGitHubApp = (state: GitHubState): Hono => {
  const app = new Hono();
  const repository = new Hono();

  repository.get("/releases/tags/:tag", (c) => {
    const release = state.releases.find(
      (candidate) => !candidate.draft && candidate.tag_name === c.req.param("tag"),
    );

    return release ? c.json(release) : c.json(NOT_FOUND_BODY, 404);
  });

  repository.get("/releases", (c) => c.json(state.releases));

  repository.post("/releases", async (c) => {
    const input = createReleaseBodySchema.parse(await c.req.json());
    const id = state.releases.length + 1;
    const release: GitHubRelease = {
      id,
      ...input,
      html_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${input.tag_name}`,
      upload_url: `https://uploads.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${id}/assets{?name,label}`,
    };

    state.releases.push(release);

    return c.json(release, 201);
  });

  repository.get("/pulls", (c) => {
    const query = c.req.query();

    return c.json(
      state.pullRequests.filter(
        (pullRequest) =>
          pullRequest.state === query.state &&
          pullRequest.head === query.head &&
          pullRequest.base === query.base,
      ),
    );
  });

  repository.post("/pulls", async (c) => {
    const input = createPullRequestBodySchema.parse(await c.req.json());
    const pullRequest: GitHubPullRequest = {
      ...input,
      number: state.pullRequests.length + 1,
      head: input.head.includes(":") ? input.head : `${GITHUB_OWNER}:${input.head}`,
      state: "open",
    };

    state.pullRequests.push(pullRequest);

    return c.json(pullRequest, 201);
  });

  repository.patch("/pulls/:number", async (c) => {
    const index = state.pullRequests.findIndex(
      (candidate) => candidate.number === Number(c.req.param("number")),
    );
    const pullRequest = state.pullRequests[index];

    if (pullRequest === undefined) {
      return c.json(NOT_FOUND_BODY, 404);
    }

    const updatedPullRequest = {
      ...pullRequest,
      ...updatePullRequestBodySchema.parse(await c.req.json()),
    };

    state.pullRequests[index] = updatedPullRequest;

    return c.json(updatedPullRequest);
  });

  app.use(async (c, next) => {
    if (c.req.header("authorization") !== AUTHORIZATION) {
      return c.json({ message: "Bad credentials" }, 401);
    }

    await next();
  });
  app.route(REPOSITORY_PATH, repository);
  app.notFound((c) =>
    c.json({ message: `Unhandled GitHub mock request: ${c.req.method} ${c.req.path}` }, 501),
  );
  app.onError((error, c) => c.json({ message: error.message }, 500));

  return app;
};

export class GitHubServer {
  readonly environment: Readonly<Record<string, string>>;
  private readonly server: ServerType;
  private readonly state: GitHubState;

  private constructor(url: string, server: ServerType, state: GitHubState) {
    this.environment = {
      GITHUB_API_URL: url,
      GITHUB_REPOSITORY: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      GITHUB_TOKEN,
    };
    this.server = server;
    this.state = state;
  }

  static async start(): Promise<GitHubServer> {
    const state: GitHubState = { releases: [], pullRequests: [] };
    const { url, server } = await startMockServer(createGitHubApp(state));

    return new GitHubServer(url, server, state);
  }

  readReleases(): GitHubRelease[] {
    return [...this.state.releases];
  }

  readPullRequests(): GitHubPullRequest[] {
    return [...this.state.pullRequests];
  }

  stop(): Promise<void> {
    return stopMockServer(this.server);
  }
}
