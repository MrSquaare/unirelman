---
title: Glossary
description: The terms used across unirelman, its plugins, and this documentation.
---

### Change

A modification recorded for a [scope](#scope), with a message, a [level](#level), and [meta](#meta). Plugins provide changes in the `getChanges` [phase](#phase), for example from [changesets](#changeset).

### Changelog section

The part of a changelog that describes one [version](#version) of one [scope](#scope): a `## ` heading followed by its changes. See the [Changelog plugin](/unirelman/reference/plugins/changelog/#format).

### Changeset

A file in `.unirelman/changesets/` that records a [change](#change) for one or more [scopes](#scope). See the [Changesets plugin](/unirelman/reference/plugins/changesets/).

### Channel

A named [prerelease](#prerelease) stage, such as `alpha`, `beta` or `rc`, declared in order by the `prereleaseChannels` option of a versioning plugin.

### Configuration file

The `unirelman.config.*` file that declares the [scopes](#scope) and the [plugin registrations](#plugin-registration). See [Configuration](/unirelman/reference/configuration/).

### Core

The `@unirelman/core` package, which runs the [pipelines](#pipeline), combines the results of the [plugins](#plugin), and applies the [file operations](#file-operation). See [Phases and pipelines](/unirelman/concepts/pipelines/).

### Current version

The [version](#version) a [scope](#scope) has before the version [pipeline](#pipeline) runs, provided in the `getCurrentVersion` [phase](#phase). The publish pipeline publishes current versions.

### Dependent update

A `patch` [change](#change) the npm plugin gives a [scope](#scope) whose [internal dependency](#internal-dependency) gets a [next version](#next-version). See [Internal dependencies](/unirelman/reference/plugins/npm/#internal-dependencies).

### Dry run

A run of a [pipeline](#pipeline) with `--dry-run`: every [phase](#phase) runs, core writes no files, and plugins skip their side effects, such as commits and publications.

### File operation

A file to write or delete, returned by a plugin in the `generateFileOperations` [phase](#phase) and applied by core. See [`FileOperation`](/unirelman/reference/plugin-api/#fileoperation).

### Fixed versioning

The `fixed` option of a versioning plugin, which gives each [group](#group) one [version](#version), computed from the changes of all its [scopes](#scope).

### Group

A name and a list of [scopes](#scope) that share a version under [fixed versioning](#fixed-versioning). `fixed: true` is one group named `all` with every scope of the [registration](#plugin-registration).

### Internal dependency

A dependency of a [scope](#scope) on another scope of the project, such as `"@example/core": "workspace:^"` in the `package.json` of `@example/cli`. See [Internal dependencies](/unirelman/reference/plugins/npm/#internal-dependencies).

### Level

The size of a [change](#change): `patch`, `minor` or `major`.

### Meta

Plugin-specific data attached to a scope, a change, a version, a file operation or a release, under the name of the plugin that adds it. See [Meta](/unirelman/reference/plugin-api/#meta).

### Next version

The [version](#version) a [scope](#scope) gets from the version [pipeline](#pipeline), computed in the `computeNextVersion` [phase](#phase) from its [current version](#current-version) and its [changes](#change).

### Output mode

The way the CLI renders a command: `interactive`, `plain` or `json`. See [Output modes](/unirelman/reference/cli/#output-modes).

### Phase

One step of a [pipeline](#pipeline), with a single job and result type, such as `getChanges` or `createReleases`. See [Phases](/unirelman/reference/plugin-api/#phases).

### Pipeline

The ordered [phases](#phase) a command runs: the version pipeline (`unirelman version`) or the publish pipeline (`unirelman publish`). See [Phases and pipelines](/unirelman/concepts/pipelines/).

### Plugin

An object that implements [phases](#phase), and optionally CLI commands. See [Plugin API](/unirelman/reference/plugin-api/).

### Plugin registration

An entry of the `plugins` list of the [configuration file](#configuration-file): a [plugin](#plugin) and the [scopes](#scope) it applies to, every scope by default.

### Prerelease

A [version](#version) on a [channel](#channel), such as `1.1.0-alpha.0`. See [Publish prereleases](/unirelman/guides/prereleases/).

### Project root

The folder of the [configuration file](#configuration-file), to which scope paths and the `.unirelman` folder are relative.

### Publish setting

The `publishingEnabled` field of `.unirelman/github-action/settings.json`, which lets the GitHub Action publish. See [The publish setting](/unirelman/concepts/github-action/#the-publish-setting).

### Range update

The update of an [internal dependency](#internal-dependency) specifier to the next version of the dependency, such as `^1.0.0` → `^1.1.0`. See [Internal dependencies](/unirelman/reference/plugins/npm/#internal-dependencies).

### Release

The publication of a [version](#version) in one destination, such as an npm version, a Git tag or a GitHub release, `created` by the run or `existing` already. See [`Release`](/unirelman/reference/plugin-api/#release).

### Release branch

The branch the GitHub Action force-pushes with the [release commit](#release-commit), `unirelman/release` by default, head of the [release pull request](#release-pull-request).

### Release commit

The commit of the files written or deleted by the version [pipeline](#pipeline), created by the [Git plugin](/unirelman/reference/plugins/git/).

### Release notes

The content of a [changelog section](#changelog-section), without its heading, provided in the `getReleaseNotes` [phase](#phase), for example as the body of a GitHub release.

### Release pull request

The pull request the GitHub Action keeps up to date with the [release commit](#release-commit). Merging it releases the [next versions](#next-version).

### Scope

A releasable unit of a project, such as a package, with a name, a folder, and its own version. See [`scopes`](/unirelman/reference/configuration/#scopes).

### Store

The folder `.unirelman/<plugin name>/`, where a plugin keeps its files, such as the prerelease state. See [`Store`](/unirelman/reference/plugin-api/#store).

### Version

A version string, such as `1.2.3`, with its [meta](#meta).

### Versioning scheme

The rules of a version format: how to parse and format a version, and how to bump it. The SemVer and CalVer plugins each implement one. See [Write a versioning scheme](/unirelman/guides/write-a-versioning-scheme/).
