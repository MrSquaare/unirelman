---
title: CLI
description: Commands, options, output modes, output streams and exit codes of the unirelman command line.
---

The CLI is provided by the `@unirelman/cli` package, as the `unirelman` command.

```sh
unirelman [options] <command>
```

## Global options

| Option                  | Description                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `-C`, `--config <path>` | Path of the [configuration file](/unirelman/reference/configuration/). Default: `unirelman.config.*` in the current folder. |
| `-v`, `--verbose`       | Debug and info logs, and the stack trace of errors.                                                                         |
| `--interactive`         | The `interactive` [output mode](#output-modes).                                                                             |
| `--plain`               | The `plain` [output mode](#output-modes).                                                                                   |
| `--json`                | The `json` [output mode](#output-modes).                                                                                    |
| `-h`, `--help`          | The usage of the command, printed instead of running it.                                                                    |
| `--version`             | The version of the CLI, printed instead of running a command.                                                               |

`--interactive`, `--plain` and `--json` are mutually exclusive.

The CLI prints `--version` before loading the configuration file. Every other command, `--help` included, loads it first, because plugins add commands.

Global options go anywhere on the command line. The options of a command come after the command: in `unirelman changesets --scopes a create`, `--scopes` is an unknown option of `changesets`. Without a command, the CLI prints the usage on standard error and exits with code `1`.

## Commands

### `version`

Runs the [version pipeline](/unirelman/concepts/pipelines/#the-version-pipeline): computes and applies the next versions.

```sh
unirelman version [--dry-run]
```

| Option      | Description                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `--dry-run` | A [dry run](/unirelman/reference/glossary/#dry-run): the next versions and file operations are reported, not applied. |

#### JSON document

With `--json`, the command prints this document, validated by `versionOutputSchema` from `@unirelman/cli/output`:

```json
{
  "pipeline": "version",
  "dryRun": false,
  "scopes": {
    "@example/core": { "currentVersion": "1.0.0", "nextVersion": "1.1.0" }
  },
  "files": [{ "path": "packages/core/VERSION", "action": "write" }]
}
```

| Field      | Type                                                                      | Description                                                                                  |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pipeline` | `"version"`                                                               | Pipeline that ran.                                                                           |
| `dryRun`   | `boolean`                                                                 | Whether the run was a [dry run](/unirelman/reference/glossary/#dry-run).                     |
| `scopes`   | `Record<string, { currentVersion: string \| null; nextVersion: string }>` | Each scope that gets a next version. `currentVersion` is `null` when no plugin provides one. |
| `files`    | `Array<{ path: string; action: "write" \| "delete" }>`                    | File operations applied, or reported on a dry run, with paths relative to the project root.  |

`scopes` is empty when no scope gets a next version.

### `publish`

Runs the [publish pipeline](/unirelman/concepts/pipelines/#the-publish-pipeline): publishes the current versions.

```sh
unirelman publish [--dry-run]
```

| Option      | Description                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `--dry-run` | A [dry run](/unirelman/reference/glossary/#dry-run): the releases to create are reported, not created. |

#### JSON document

With `--json`, the command prints this document, validated by `publishOutputSchema` from `@unirelman/cli/output`:

```json
{
  "pipeline": "publish",
  "dryRun": false,
  "releases": {
    "@example/core": [
      { "type": "example", "name": "@example/core@1.1.0", "status": "created", "meta": {} }
    ]
  }
}
```

| Field      | Type                        | Description                                                              |
| ---------- | --------------------------- | ------------------------------------------------------------------------ |
| `pipeline` | `"publish"`                 | Pipeline that ran.                                                       |
| `dryRun`   | `boolean`                   | Whether the run was a [dry run](/unirelman/reference/glossary/#dry-run). |
| `releases` | `Record<string, Release[]>` | The [releases](/unirelman/reference/glossary/#release) of each scope.    |

Each [release](/unirelman/reference/glossary/#release):

| Field    | Type                      | Description                                                                           |
| -------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `type`   | `string`                  | Kind of release, set by the plugin.                                                   |
| `name`   | `string`                  | Identifier of the release in its destination.                                         |
| `status` | `"created" \| "existing"` | `created` when this run publishes it, `existing` when the destination already has it. |
| `meta`   | `object`                  | [Meta](/unirelman/reference/glossary/#meta) of the release, set by the plugin.        |

### Plugin commands

Plugins add commands under their name, documented by each plugin:

```sh
unirelman <plugin> <command> [options]
```

## Output modes

| Mode          | Output                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interactive` | Styled messages, a spinner while a command runs, and prompts for missing options.                                                                        |
| `plain`       | One line per message. A missing option fails the command with `CLIPromptUnavailableError`, naming the option to pass.                                    |
| `json`        | Messages as in `plain`, and the result of the command as a JSON document on standard output, documented with each command. Prompts behave as in `plain`. |

The default mode is `interactive` when standard input and standard error are both terminals, and `plain` otherwise.

After a pipeline, the last message summarizes the next versions (`version`) or the created releases (`publish`). Logs show warnings, plus debug and info messages with `--verbose`.

## Output streams

| Output                                        | Stream          |
| --------------------------------------------- | --------------- |
| JSON document of a command in `json` mode     | Standard output |
| Help (`--help`) and version (`--version`)     | Standard output |
| Messages, progress, prompts, logs, and errors | Standard error  |
| Usage when the command is missing             | Standard error  |

## Errors and exit codes

| Exit code | Meaning                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| `0`       | The command succeeded.                                                           |
| `1`       | The command failed, is missing or unknown, or got an invalid option or argument. |
| `130`     | The command was cancelled during a prompt.                                       |

On failure, the CLI prints the error message on standard error, prefixed with `error:` in `plain` and `json` modes. When a plugin fails during a pipeline, the message names the plugin and the phase:

```
error: Plugin "example" failed in the createReleases phase: Failed to publish example@1.0.1
```

With `--verbose`, the CLI prints the stack trace of the error, followed by the stack trace of each error it wraps, introduced by `Caused by:`.

| Error                            | Cause                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| `CLIConflictingOutputModesError` | More than one of `--interactive`, `--plain` and `--json` is given.          |
| `CLIPromptUnavailableError`      | A missing option needs a prompt in `plain` or `json` mode.                  |
| `CLIPromptCancelledError`        | A prompt was cancelled.                                                     |
| `CLIUnknownCommandError`         | A command name isn't a command of its group.                                |
| `CLIUnknownOptionError`          | An option isn't an option of the command, or of a group before its command. |
| `CLIMissingOptionValueError`     | A string option has no value.                                               |
| `CLIUnexpectedOptionValueError`  | A boolean option is given a value.                                          |
| `CLIUnexpectedArgumentError`     | An argument follows the command.                                            |
| `CLIReservedOptionError`         | A plugin command declares a global option name or alias.                    |
| `CLIDuplicateOptionError`        | A plugin command declares the same option twice.                            |
| `CLIInvalidOptionAliasError`     | A plugin command declares an alias that isn't one character.                |
| `CLIInvalidOptionTypeError`      | A parsed value doesn't match the type of its option.                        |

Commands run tools such as `git` and `npm`, and read JSON. Their failures reach the CLI through any plugin:

| Error              | Cause                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `ExecSpawnError`   | A command fails to start, such as a tool that isn't installed.          |
| `ExecError`        | A command exits with an unexpected exit code, or is killed by a signal. |
| `InvalidJSONError` | A JSON file or a command output isn't valid JSON of the expected shape. |

Configuration errors are listed in [Configuration](/unirelman/reference/configuration/#errors), and pipeline errors in [Plugin API](/unirelman/reference/plugin-api/#errors).

## Related

- [Script releases](/unirelman/guides/scripting/)
- [Configuration](/unirelman/reference/configuration/)
