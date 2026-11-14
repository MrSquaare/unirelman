---
title: How unirelman works
description: Scopes, changes, versions and plugins - the model behind unirelman.
sidebar:
  order: 1
---

unirelman is a release engine: core defines a few concepts and the order in which things happen, and plugins do the work. This page explains the model.

## Scopes

A [scope](/unirelman/reference/glossary/#scope) is something you release: a package, an application, or the whole repository. Each scope has a name and a folder, and gets its own version.

A single-package project has one scope. A monorepo has one per package, and the repository root can be one too. Each scope moves at its own pace, with the changes recorded for it and the versioning scheme registered for it. Scopes released as one product share a version through [fixed versioning](/unirelman/reference/glossary/#fixed-versioning).

## Changes and versions

A release goes from changes to versions:

1. Each scope has a [current version](/unirelman/reference/glossary/#current-version), read from where it lives, for example `package.json`.
2. You record [changes](/unirelman/reference/glossary/#change): what changed, in which scopes, and at which [level](/unirelman/reference/glossary/#level).
3. From the current version and the changes, a [versioning scheme](/unirelman/reference/glossary/#versioning-scheme) computes the [next version](/unirelman/reference/glossary/#next-version).
4. The next version is written back, the changelog is updated, and the release is committed.
5. Later, the current version is published: to a registry, as a Git tag, as a GitHub release.

## Plugins

Plugins do every step above, so a project uses the plugins it needs, and each source or destination is swappable:

| Concern                 | Built-in plugin      | A custom plugin could use…                       |
| ----------------------- | -------------------- | ------------------------------------------------ |
| Where versions live     | npm (`package.json`) | A `VERSION` file, `Cargo.toml`, `pyproject.toml` |
| Where changes come from | Changesets           | Conventional commits                             |
| How versions bump       | SemVer, CalVer       | Any scheme                                       |
| What gets written       | Changelog            | Another changelog format                         |
| What gets published     | npm, Git, GitHub     | Other registries or forges                       |

A plugin is registered for every scope or for some of them. This is how a monorepo uses SemVer for its libraries and CalVer for its application.

## Two pipelines

Two commands run plugins: `version` and `publish`. Each runs a fixed sequence of [phases](/unirelman/reference/glossary/#phase), and plugins take part in the phases they need. The release is a commit, or a pull request, that you review between the two. See [Phases and pipelines](/unirelman/concepts/pipelines/).

## Related

- [Release your first package](/unirelman/tutorials/first-release/)
- [Configuration reference](/unirelman/reference/configuration/)
