---
title: What is unirelman?
description: The universal release manager, what it does and how it's built.
sidebar:
  order: 1
---

unirelman is a universal release manager: it versions, changelogs and publishes any project, from a single package to a monorepo that mixes versioning schemes.

## Context

Every release repeats the same steps: decide the next version from what changed, write it where it lives, write the changelog, commit and tag, then publish to a registry and a forge. Each project combines these steps differently: an npm library publishes to the registry, an application tags a calendar version, a monorepo releases each package at its own pace or all of them together.

## Approach

unirelman runs a release in two commands, `version` and `publish`, and plugins do each step. A project registers the plugins it needs, for all its [scopes](/unirelman/reference/glossary/#scope) or for some of them. [How unirelman works](/unirelman/concepts/overview/) explains the model.

## Features

- **Changesets**: record each change in a file, with its scopes, level and message. See the [Changesets plugin](/unirelman/reference/plugins/changesets/).
- **Semantic and calendar versioning**: see [Choose a versioning scheme](/unirelman/guides/versioning-schemes/).
- **Prereleases**: move a scope through channels such as `alpha`, `beta` and `rc`. See [Publish prereleases](/unirelman/guides/prereleases/).
- **Monorepos**: version each scope on its own, or several together. See [Release a monorepo](/unirelman/guides/monorepo/).
- **Changelogs**: one for the project, or one per scope. See the [Changelog plugin](/unirelman/reference/plugins/changelog/).
- **npm, Git tags and GitHub releases**: see [Publish to npm](/unirelman/guides/publish-to-npm/) and [Create GitHub releases](/unirelman/guides/github-releases/).
- **Version references in any file**: see the [Replace plugin](/unirelman/reference/plugins/replace/).
- **GitHub Action**: a release pull request, published when you merge it. See [Automate releases with GitHub Actions](/unirelman/tutorials/github-action/).
- **Dry runs and JSON output**: see [Script releases](/unirelman/guides/scripting/).
- **Your own plugins**: see [Build your first plugin](/unirelman/tutorials/first-plugin/).

## Next steps

- [Get started](/unirelman/introduction/getting-started/)
- [Release your first package](/unirelman/tutorials/first-release/)
