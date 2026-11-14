---
title: Phases and pipelines
description: How the version and publish pipelines run plugins, and why they work this way.
sidebar:
  order: 2
---

This page explains how unirelman runs plugins, and the design choices behind it.

## Phases

A [phase](/unirelman/reference/glossary/#phase) is one step of a pipeline, such as "read the current versions" or "create the releases". Plugins implement the phases they need. Within a phase, plugins run in the order of the configuration, and core combines their results.

Each phase has one job and one result type. This is what makes plugins composable: the Changesets plugin provides changes for any version source, and the npm plugin provides versions for any change source.

## The version pipeline

```
initialize
→ getCurrentVersion → parseCurrentVersion
→ getChanges
→ computeNextVersion → getDependencyChanges (repeated while new scopes get a next version)
→ generateFileOperations → (core applies file operations)
→ prepare
→ teardown
```

`getDependencyChanges` gives changes to the dependents of released scopes, such as the [dependent updates](/unirelman/reference/glossary/#dependent-update) of the npm plugin. The [plugin API](/unirelman/reference/plugin-api/#phases) describes each phase.

## The publish pipeline

```
initialize
→ getCurrentVersion → parseCurrentVersion
→ getReleaseNotes
→ createReleases
→ finalize
→ teardown
```

The publish pipeline publishes the **current** versions: whatever the version pipeline last wrote. Release notes are read back from the changelog, so every destination gets the same notes.

## Plugins describe, core applies

`generateFileOperations` returns descriptions of files, and core writes them. This guarantees that:

- **A failing plugin writes nothing.** Every plugin computes its files first, and core writes them only once every plugin succeeded.
- **Conflicts are caught.** When two plugins target the same file with different content, the pipeline fails.
- **Dry runs are reliable.** Core skips the writes in one place, for every plugin.
- **The commit sees every file.** `prepare` runs after all files are written, whatever the plugin order.

## Stateless publishing

Each `publish` asks the destinations what they already have: each plugin checks its own. Is this version on the npm registry? Does this tag exist? Is there a GitHub release for it?

This makes `publish` **idempotent**: running it again creates only what's missing. When a publish fails halfway, for example npm succeeded but GitHub was down, running it again finishes the job and publishes each release once. The destinations are the single source of truth.

The cost is that releases have recognizable names, such as the tag names of the Git plugin. See [Adopt unirelman in an existing project](/unirelman/guides/existing-project/).

## Determinism

Pipelines depend on the repository and the configuration only. The same commit and configuration give the same versions and the same release files, with one exception by design: calendar versioning reads the current date.

## Related

- [Plugin API reference](/unirelman/reference/plugin-api/)
