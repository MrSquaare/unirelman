export const CONFIG_CWD = "/repo";

export const SCOPE_NAMES = {
  ALPHA: "@scope/a",
  BETA: "@scope/b",
  MISSING: "@scope/missing",
  REMOVED: "@scope/removed",
} as const;

export const SCOPE_PATHS = {
  [SCOPE_NAMES.ALPHA]: `${CONFIG_CWD}/packages/a`,
  [SCOPE_NAMES.BETA]: `${CONFIG_CWD}/packages/b`,
  [SCOPE_NAMES.MISSING]: `${CONFIG_CWD}/packages/missing`,
  [SCOPE_NAMES.REMOVED]: `${CONFIG_CWD}/packages/removed`,
} as const;

export const PLUGIN_NAMES = {
  A: "plugin-a",
  B: "plugin-b",
} as const;

export const CONFIG_SCOPE_PATHS = {
  [SCOPE_NAMES.ALPHA]: "./packages/alpha",
  [SCOPE_NAMES.BETA]: "packages/beta",
  [SCOPE_NAMES.MISSING]: "./packages/missing",
  [SCOPE_NAMES.REMOVED]: "./packages/removed",
} as const;

export const VERSIONS = {
  DEFAULT: "1.2.3",
  MAJOR: "2.0.0",
} as const;
