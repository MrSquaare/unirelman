import type { Store } from "@unirelman/core";

import type { PrereleaseScopeState, PrereleaseState } from "./types";

import { PRERELEASE_STATE_FILE } from "./constants";
import { PrereleaseStateMismatchError } from "./errors";
import { prereleaseStateSchema } from "./types";

export const readPrereleaseState = async (store: Store): Promise<PrereleaseState> => {
  return store.readJSON(PRERELEASE_STATE_FILE, prereleaseStateSchema, {});
};

export const writePrereleaseState = async (store: Store, state: PrereleaseState): Promise<void> => {
  await store.writeJSON(PRERELEASE_STATE_FILE, state);
};

export const resolveGroupPrerelease = (
  state: PrereleaseState,
  scopes: readonly string[],
): PrereleaseScopeState | undefined => {
  const channels = Object.fromEntries(scopes.map((scope) => [scope, state[scope]?.channel]));

  if (new Set(Object.values(channels)).size > 1) {
    throw new PrereleaseStateMismatchError(channels);
  }

  const [scope] = scopes;

  return scope === undefined ? undefined : state[scope];
};
