---
title: Helpers
description: Shared building blocks for plugins, exported by @unirelman/helpers.
---

`@unirelman/helpers` provides the logic the built-in plugins share, so other plugins behave the same way. Each domain is a separate entry point.

## `versioning`

```ts
import { createVersioningSchemePlugin, type VersioningScheme } from "@unirelman/helpers/versioning";
```

### `VersioningScheme`

```ts
interface VersioningScheme<TVersion extends object> {
  readonly name: string;
  parse(value: string): TVersion | undefined;
  format(version: TVersion): string;
  bumpRelease(version: TVersion, changes: NonEmptyArray<Change>): TVersion;
  isPrereleaseBaseStale(version: TVersion, changes: NonEmptyArray<Change>): boolean;
}
```

| Member                  | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `name`                  | Name of the plugin built from the scheme.                                              |
| `parse`                 | Parses a version without prerelease suffix, or returns `undefined` for another format. |
| `format`                | Formats a version without prerelease suffix.                                           |
| `bumpRelease`           | Returns the next release version for the given changes.                                |
| `isPrereleaseBaseStale` | Returns whether the changes require bumping the base of a running prerelease again.    |

### `createVersioningSchemePlugin`

`createVersioningSchemePlugin(scheme, options?)` returns a `CLIPlugin` named after the scheme, with:

- `parseCurrentVersion`: parses current versions and fills `meta[scheme.name]` and `meta.prerelease`.
- `computeNextVersion`: computes next versions with the [prerelease rules](/unirelman/reference/plugins/semver/#next-version-rules) and [fixed versioning](/unirelman/reference/glossary/#fixed-versioning).
- The [`pre` command](/unirelman/reference/plugins/semver/#semver-pre).

`options` is `VersioningOptions`: `{ prereleaseChannels?: string[]; fixed?: boolean | Record<string, string[]> }`, the [options of the SemVer plugin](/unirelman/reference/plugins/semver/#options).

See [Write a versioning scheme](/unirelman/guides/write-a-versioning-scheme/).

## `group`

```ts
import { resolveGroups, type GroupRecord } from "@unirelman/helpers/group";
```

A group is a name and a list of scopes.

| Export                              | Description                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Group`                             | `{ name: string; scopes: string[] }`.                                                                                                 |
| `GroupRecord`                       | `Record<string, string[]>`: group names and their scopes, as users write them.                                                        |
| `resolveGroups(groups, scopeNames)` | The groups of a `GroupRecord`, checked against the scopes; `true` gives one group named `all` with every scope, and `false` no group. |
| `resolveGroupLabel(group)`          | `group <name> (<scopes>)`, as messages show a group.                                                                                  |
| `ALL_SCOPES_GROUP_NAME`             | `"all"`.                                                                                                                              |
| `GroupEmptyError`                   | A group has no scope.                                                                                                                 |
| `GroupUnknownScopeError`            | A group lists a scope outside the given scopes.                                                                                       |
| `GroupDuplicateScopeError`          | A scope is in two groups.                                                                                                             |

## `prerelease`

```ts
import { parsePrereleaseVersion, type PrereleaseTag } from "@unirelman/helpers/prerelease";
```

| Export                                                              | Description                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PrereleaseTag`                                                     | `{ channel: string; increment: number }`.                                                                                                                                       |
| `PrereleaseState`, `prereleaseStateSchema`                          | The [prerelease state](/unirelman/reference/plugins/semver/#prerelease-state), a `ReadonlyMap` of each scope name to `{ channel }`, and the Zod schema that reads it from JSON. |
| `prereleaseOutputSchema`                                            | The Zod schema of the [`semver pre` JSON document](/unirelman/reference/plugins/semver/#semver-pre).                                                                            |
| `PrereleaseOptions`                                                 | `{ prereleaseChannels?: string[] }`.                                                                                                                                            |
| `parsePrereleaseVersion(value)`                                     | Splits `1.3.0-beta.2` into `{ version: "1.3.0", prerelease: { channel: "beta", increment: 2 } }`. `prerelease` is `undefined` without suffix.                                   |
| `formatPrereleaseVersion(version, tag)`                             | Joins a version and a tag: `1.3.0-beta.2`.                                                                                                                                      |
| `readPrereleaseState(store)` / `writePrereleaseState(store, state)` | Read and write the prerelease state in `prerelease.json` of a plugin store.                                                                                                     |

Importing this entry point also declares `VersionMeta.prerelease`, the prerelease tag of a version in any versioning scheme. The npm and GitHub plugins read it to handle prereleases.

## `git`

```ts
import { resolveDefaultGitTag, resolveGitTag, type GitTagFormat } from "@unirelman/helpers/git";
```

| Export                                          | Description                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GitTagFormat`                                  | `(input: { scopeName: string; version: string; isRootScope: boolean }) => string`: names the tag of a version. |
| `resolveDefaultGitTag`                          | The default `GitTagFormat`: the version for a scope at the project root, `<scope>@<version>` otherwise.        |
| `resolveGitTag(scope, version, cwd, tagFormat)` | Tag name of a version, with the given format.                                                                  |
| `isRootScope(scope, cwd)`                       | Whether the scope is the project root.                                                                         |

Plugins that refer to tags, such as the Git and GitHub plugins, take a `tagFormat` option, `resolveDefaultGitTag` by default, and name tags with `resolveGitTag`.

## Related

- [Write a versioning scheme](/unirelman/guides/write-a-versioning-scheme/)
- [Plugin API](/unirelman/reference/plugin-api/)
