import type { Environment } from "./types";

export const resolveCommandEnvironment = (
  environment: Environment,
  overrides: Readonly<Record<string, string>>,
): Record<string, string> => {
  const commandEnvironment = Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );

  return { ...commandEnvironment, ...overrides };
};
