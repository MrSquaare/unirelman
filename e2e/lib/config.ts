export type PluginName =
  | "calver"
  | "changelog"
  | "changesets"
  | "git"
  | "github"
  | "npm"
  | "replace"
  | "semver";

export type PluginEntry = {
  readonly name: PluginName;
  readonly options?: string;
  readonly scopes?: readonly string[];
};

export type ConfigSpec = {
  readonly scopes: Readonly<Record<string, string>>;
  readonly plugins: readonly PluginEntry[];
  readonly preamble?: string;
};

type PluginModule = {
  readonly factory: string;
  readonly module: string;
};

const PLUGIN_MODULES = {
  calver: { factory: "createCalverPlugin", module: "@unirelman/plugin-calver" },
  changelog: { factory: "createChangelogPlugin", module: "@unirelman/plugin-changelog" },
  changesets: { factory: "createChangesetsPlugin", module: "@unirelman/plugin-changesets" },
  git: { factory: "createGitPlugin", module: "@unirelman/plugin-git" },
  github: { factory: "createGitHubPlugin", module: "@unirelman/plugin-github" },
  npm: { factory: "createNpmPlugin", module: "@unirelman/plugin-npm" },
  replace: { factory: "createReplacePlugin", module: "@unirelman/plugin-replace" },
  semver: { factory: "createSemverPlugin", module: "@unirelman/plugin-semver" },
} as const satisfies Record<PluginName, PluginModule>;

const renderPluginEntry = (entry: PluginEntry): string => {
  const call = `${PLUGIN_MODULES[entry.name].factory}(${entry.options ?? ""})`;

  if (entry.scopes === undefined) {
    return `${call},`;
  }

  return `{ plugin: ${call}, scopes: ${JSON.stringify(entry.scopes)} },`;
};

export const renderConfig = (spec: ConfigSpec): string => {
  const pluginNames = [...new Set(spec.plugins.map((entry) => entry.name))].sort();
  const imports = pluginNames.map((name) => {
    const { factory, module } = PLUGIN_MODULES[name];

    return `import { ${factory} } from "${module}";`;
  });

  return [
    'import { defineConfig } from "@unirelman/cli";',
    ...imports,
    "",
    ...(spec.preamble === undefined ? [] : [spec.preamble, ""]),
    "export default defineConfig({",
    `  scopes: ${JSON.stringify(spec.scopes)},`,
    "  plugins: [",
    ...spec.plugins.map((entry) => `    ${renderPluginEntry(entry)}`),
    "  ],",
    "});",
    "",
  ].join("\n");
};
