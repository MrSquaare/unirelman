import type { Store } from "@unirelman/core";

import { ACTION_SETTINGS_FILE } from "./constants";
import { actionSettingsSchema, type ActionSettings } from "./types";

export const resolveActionSettingsPath = (store: Store): string => {
  return store.resolvePath(ACTION_SETTINGS_FILE);
};

export const readActionSettings = (store: Store): Promise<ActionSettings> => {
  return store.readJSON(ACTION_SETTINGS_FILE, actionSettingsSchema, { publishingEnabled: false });
};

export const writeActionSettings = (store: Store, settings: ActionSettings): Promise<void> => {
  return store.writeJSON(ACTION_SETTINGS_FILE, settings);
};
