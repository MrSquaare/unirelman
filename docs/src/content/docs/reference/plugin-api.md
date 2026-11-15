---
title: Plugin API
description: "The contract between unirelman and its plugins: phases, context, state, entities, and meta."
---

Types are exported by `@unirelman/core`, except the [CLI plugin](#cli-plugins) API, exported by `@unirelman/cli`.

## `Plugin`

```ts
interface Plugin extends Partial<PhaseMap> {
  name: string;
}
```

| Member          | Description                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`          | Name, following the [plugin name](#plugin-names) rules. It identifies the plugin in the configuration and the logs, and names its store folder and commands. |
| Phase functions | Optional. One function per phase the plugin takes part in.                                                                                                   |

### Plugin names

A plugin name:

- Contains only lowercase letters, digits, and the character `-`, such as `version-file`.
- Is not `version` or `publish` when the plugin is a [CLI plugin](#cli-plugins).
- Is unique in the configuration.

## Phases

Each phase function has this signature, typed per phase, such as `PhaseFunction<"getChanges">`:

```ts
type PhaseFunction<TName extends PhaseName> = (
  context: PhaseFunctionContext<TName>,
  state: PhaseFunctionState<TName>,
) => PhaseFunctionResult<TName> | Promise<PhaseFunctionResult<TName>>;
```

Within a phase, plugins run in the order of the configuration. Each plugin only receives the scopes it's registered for, in `context.scopes` and in every scope map of `state`, and returns results only for those scopes: a result for any other scope fails with `CoreUnknownPhaseResultScopeError`, except in phases returning `void`, whose results are ignored. Results of all plugins are combined as the Combination column states. For a phase with one plugin per scope, two plugins providing it for the same scope fail with `CoreConflictingPhaseProvidersError` when the configuration loads.

| Phase                    | Pipelines | State                                                        | Result                   | Combination                                                         |
| ------------------------ | --------- | ------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| `initialize`             | both      | `{}`                                                         | `void`                   | —                                                                   |
| `getCurrentVersion`      | both      | `{}`                                                         | `ScopeVersionMap`        | One plugin per scope.                                               |
| `parseCurrentVersion`    | both      | `{ currentVersions }`                                        | `ScopeVersionMetaMap`    | One plugin per scope. Merged into the meta of the current versions. |
| `getChanges`             | version   | `{ currentVersions }`                                        | `ScopeChangesMap`        | Lists concatenated.                                                 |
| `computeNextVersion`     | version   | `{ currentVersions, changes }`                               | `ScopeVersionMap`        | One plugin per scope.                                               |
| `getDependencyChanges`   | version   | `{ currentVersions, changes, nextVersions }`                 | `ScopeChangesMap`        | Lists concatenated.                                                 |
| `generateFileOperations` | version   | `{ currentVersions, changes, nextVersions }`                 | `ScopeFileOperationsMap` | Lists concatenated, then applied by core.                           |
| `prepare`                | version   | `{ currentVersions, changes, nextVersions, fileOperations }` | `void`                   | —                                                                   |
| `getReleaseNotes`        | publish   | `{ currentVersions }`                                        | `ScopeReleaseNotesMap`   | One plugin per scope.                                               |
| `createReleases`         | publish   | `{ currentVersions, releaseNotes }`                          | `ScopeReleasesMap`       | Lists concatenated.                                                 |
| `finalize`               | publish   | `{ currentVersions, releaseNotes, releases }`                | `void`                   | —                                                                   |
| `teardown`               | both      | Everything computed so far, partial                          | `void`                   | Receives the pipeline error in `context.error`.                     |

- `finalize` receives every release of the run, after `createReleases`: it acts on the published releases, for example to announce them.
- `teardown` runs at the end of every pipeline, after a failure too: it releases resources. Every plugin's `teardown` runs, even when one fails. Its context is a `TeardownContext`, a `PhaseContext` with `error`: the error the pipeline failed with, or `undefined` after a success. A failing `teardown` throws its `CorePhaseError`, or a `CoreTeardownError` holding each `CorePhaseError` when several fail. When `teardown` also fails after a pipeline failure, the run fails with a `CleanupError` that holds both errors.
- After `getChanges`, each scope with changes needs a `getCurrentVersion` and a `computeNextVersion` provider. Otherwise, the pipeline fails with `CoreMissingPhaseProviderError`.
- After `getDependencyChanges`, core adds its changes to the changes from `getChanges` and runs `computeNextVersion` again. While new scopes get a next version, core runs `getDependencyChanges` again with the new next versions, and replaces the previous dependency changes with its result. A next version computed before that changes fails with `CoreUnstableNextVersionError`.
- After `generateFileOperations`, core applies the file operations, except on a dry run. Operations on the same path are identical. Otherwise, the pipeline fails with `CoreConflictingFileOperationError`.

The [Phases and pipelines](/unirelman/concepts/pipelines/) page explains the reasoning.

## Context

### `PhaseContext`

```ts
type PhaseContext = PluginContext & {
  readonly dryRun: boolean;
  readonly pipeline: "version" | "publish";
};
```

| Member     | Description                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dryRun`   | `true` on a [dry run](/unirelman/reference/glossary/#dry-run). Phases with side effects, such as `prepare`, `createReleases` and `finalize`, skip them and log what they would do. |
| `pipeline` | Pipeline being run.                                                                                                                                                                |

### `PluginContext`

```ts
type PluginContext = {
  readonly cwd: string;
  readonly scopes: ScopeMap;
  readonly logger: Logger;
  readonly fs: FS;
  readonly store: Store;
};
```

| Member   | Description                                          |
| -------- | ---------------------------------------------------- |
| `cwd`    | Absolute path of the project root.                   |
| `scopes` | Scopes the plugin is registered for.                 |
| `logger` | [Logger](#logger) labeled with the plugin name.      |
| `fs`     | File access relative to the project root.            |
| `store`  | File access relative to `.unirelman/<plugin name>/`. |

## Entities

### `Scope`

```ts
type Scope = { readonly name: string; readonly path: string; readonly meta: ScopeMeta };
```

`path` is absolute.

### `Change`

```ts
type Change = { readonly message: string; readonly level: ChangeLevel; readonly meta: ChangeMeta };

const CHANGE_LEVELS = ["patch", "minor", "major"] as const;

type ChangeLevel = (typeof CHANGE_LEVELS)[number];
```

`CHANGE_LEVELS` lists the levels from the lowest to the highest.

### `Version`

```ts
type Version = { readonly version: string; readonly meta: VersionMeta };
```

### `FileOperation`

```ts
type FileOperation =
  | {
      readonly type: string;
      readonly path: string;
      readonly action: "write";
      readonly content: string;
      readonly meta: FileOperationMeta;
    }
  | {
      readonly type: string;
      readonly path: string;
      readonly action: "delete";
      readonly meta: FileOperationMeta;
    };
```

| Member    | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `type`    | Kind of file, defined by the plugin, for example `version-file`. |
| `path`    | Absolute, or relative to the project root. Non-empty.            |
| `content` | Full content to write.                                           |

### `Release`

```ts
type Release = {
  readonly type: string;
  readonly name: string;
  readonly status: "created" | "existing";
  readonly meta: ReleaseMeta;
};
```

Report `existing` when the destination already has the version, and `created` when this run published it or, on a dry run, would.

### Scope maps

Scopes, state, and results are maps keyed by scope name. A phase returns a `Map`, such as `new Map([["@example/core", version]])`.

```ts
type ScopeMap = ReadonlyMap<string, Scope>;
type ScopeVersionMap = ReadonlyMap<string, Version>;
type ScopeVersionMetaMap = ReadonlyMap<string, VersionMeta>;
type ScopeChangesMap = ReadonlyMap<string, Change[]>;
type ScopeFileOperationsMap = ReadonlyMap<string, FileOperation[]>;
type ScopeReleaseNotesMap = ReadonlyMap<string, string>;
type ScopeReleasesMap = ReadonlyMap<string, Release[]>;
```

## Meta

`ScopeMeta`, `ChangeMeta`, `VersionMeta`, `FileOperationMeta` and `ReleaseMeta` are empty interfaces that plugins extend with declaration merging:

```ts
declare module "@unirelman/core" {
  interface VersionMeta {
    counter?: { value: number };
  }
}
```

Declare the fields optional: entities from other plugins lack them.

Each plugin reference lists the meta fields its plugin declares.

## File access

### `FS`

All paths are relative to the root of the instance, or absolute.

| Method                                    | Description                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `list(): Promise<string[]>`               | Names of the files directly in the root folder, or an empty list when the folder is missing.  |
| `resolvePath(path): string`               | Absolute path of the file.                                                                    |
| `exists(path): Promise<boolean>`          | Whether the file exists. Throws on any error other than a missing file.                       |
| `read(path, fallback?): Promise<string>`  | Content of the file. Throws `CoreFileNotFoundError` when missing, unless `fallback` is given. |
| `readJSON(path, schema, fallback?)`       | Content parsed as JSON and validated with a Zod schema.                                       |
| `readAll(): Promise<{ path; content }[]>` | Every file of `list()`, with its content.                                                     |
| `write(path, content): Promise<void>`     | Writes the file, creating folders as needed.                                                  |
| `writeJSON(path, value): Promise<void>`   | Writes the value as indented JSON.                                                            |
| `delete(path): Promise<void>`             | Deletes the file, when it exists.                                                             |
| `deleteAll(): Promise<void>`              | Deletes every file of `list()`.                                                               |

### `Store`

An `FS` rooted at `.unirelman/<plugin name>/`. Use it for files your plugin owns.

## `Logger`

```ts
interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}
```

| Method           | Printed when        |
| ---------------- | ------------------- |
| `debug(message)` | `--verbose` is set. |
| `info(message)`  | `--verbose` is set. |
| `warn(message)`  | Always.             |

The CLI prints messages on standard error, labeled with the plugin name. Failures are thrown: see [Errors](#errors).

## CLI plugins

A plugin that adds commands implements `CLIPlugin`, from `@unirelman/cli`:

```ts
interface CLIPlugin extends Plugin {
  commandDescription: string;
  commands: (context: PluginContext) => Readonly<Record<string, Command>>;
}
```

| Member               | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `commandDescription` | Description of `unirelman <plugin name>` in the help.                      |
| `commands`           | Returns the commands under `unirelman <plugin name>`, keyed by their name. |

### `defineCommand`

```ts
defineCommand({
  meta: { name: "bump", description: "Write the next version" },
  title: "Bump",
  options: { scope: { type: "string", description: "Scope to bump" } },
  run: async ({ options, ui }) => ({ scope: options.scope }),
  success: (result) => ({ summary: [], message: `Bumped ${result.scope}` }),
  failure: "Bump failed.",
});
```

| Member    | Description                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `meta`    | Name and description of the command in the help.                                                      |
| `title`   | First message of the command.                                                                         |
| `options` | Options of the command. See [Command options](#command-options).                                      |
| `run`     | Runs the command with the parsed `options` and the [command UI](#command-ui), and returns its result. |
| `success` | Builds the end of the command from its result: `summary` lines, then the last `message`.              |
| `failure` | Optional. Last message of the command when it fails.                                                  |

#### Command options

Each key of `options` is a camel-case name starting with a lowercase letter, which becomes the kebab-case flag: `dryRun` gives `--dry-run`. Each entry:

| Member        | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `type`        | `"boolean"` (a flag) or `"string"` (a flag followed by its value).                             |
| `description` | Description of the option in the help.                                                         |
| `alias`       | Optional. One-character short flag, such as `"s"` for `-s`.                                    |
| `valueHint`   | Optional, for a `string` option. Placeholder of the value in the help. Default: the flag name. |

In `run`, each option is its value, or `undefined` when it isn't given. Options and aliases must differ from each other and from the [global options](/unirelman/reference/cli/#global-options).

The CLI renders the messages, and prints the result as a JSON document in `json` mode. `defineCommandGroup({ meta, subCommands })` nests commands under a name.

### Command UI

```ts
interface CommandUI {
  readonly progress: { start(message: string): void; stop(): void };
  select<T>(prompt: SelectPrompt<T>): Promise<T>;
  multiselect<T>(prompt: SelectPrompt<T>): Promise<T[]>;
  text(prompt: TextPrompt): Promise<string>;
}

type SelectPrompt<T> = {
  message: string;
  option: string;
  options: { value: T; label: string }[];
};

type TextPrompt = {
  message: string;
  option: string;
  validate?: (value: string) => string | undefined;
};
```

| Member                | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `progress`            | Starts and stops the progress indicator of the command.                  |
| `select(prompt)`      | Prompts for one value among `options`.                                   |
| `multiselect(prompt)` | Prompts for one or more values among `options`.                          |
| `text(prompt)`        | Prompts for a text. `validate` returns an error message, or `undefined`. |

`option` names the command option that provides the same value, such as `--scope`. A prompt rejects with `CLIPromptCancelledError` when the user cancels it, and with `CLIPromptUnavailableError`, naming `option`, in the `plain` and `json` [output modes](/unirelman/reference/cli/#output-modes).

## Errors

Phases and commands report failures by throwing an error. The CLI prints it on standard error and exits with code `1`.

When a phase function throws, core wraps the error in a `CorePhaseError` that names the plugin and the phase: `Plugin "<plugin>" failed in the <phase> phase: <message>`. The original error is its `cause`.

| Error                               | Cause                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `CorePhaseError`                    | A phase function throws.                                                                                |
| `CoreUnknownPhaseResultScopeError`  | A phase function returns a result for a scope its plugin isn't registered for.                          |
| `CoreTeardownError`                 | Several `teardown` functions throw. It holds each `CorePhaseError`.                                     |
| `CoreMissingPhaseProviderError`     | A scope with changes has no `getCurrentVersion` or no `computeNextVersion` provider.                    |
| `CoreUnstableNextVersionError`      | A next version changes when `computeNextVersion` runs again with the changes of `getDependencyChanges`. |
| `CoreEmptyFileOperationPathError`   | A file operation has an empty path.                                                                     |
| `CoreConflictingFileOperationError` | Two file operations on the same path have different actions or contents.                                |
| `CoreFileNotFoundError`             | `read` or `readJSON` of `FS` or `Store` reads a missing file without a fallback.                        |
| `CleanupError`                      | `teardown` fails after a pipeline failure. It holds both errors.                                        |

Errors of the configuration are listed in [Configuration](/unirelman/reference/configuration/#errors).

## Related

- [Build your first plugin](/unirelman/tutorials/first-plugin/)
- [Phases and pipelines](/unirelman/concepts/pipelines/)
- [Helpers](/unirelman/reference/helpers/)
