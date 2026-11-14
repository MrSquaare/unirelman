import type { ChangeLevel } from "@unirelman/core";

import { ChangesetsInvalidLevelError } from "../errors";
import { isChangeLevel } from "./guard";

export const parseScopes = (scopesValue: string | undefined): string[] => {
  if (!scopesValue) {
    return [];
  }

  return [
    ...new Set(
      scopesValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
};

export const parseLevel = (levelValue: string | undefined): ChangeLevel | undefined => {
  if (!levelValue) {
    return undefined;
  }

  const normalized = levelValue.trim().toLowerCase();

  if (!isChangeLevel(normalized)) {
    throw new ChangesetsInvalidLevelError(levelValue);
  }

  return normalized;
};

export const parseMessage = (messageValue: string | undefined): string | undefined => {
  const message = messageValue?.trim();

  return message ? message : undefined;
};
