---
title: Adopt unirelman in an existing project
description: Add unirelman to a project that already has versions, tags, and releases.
sidebar:
  order: 6
---

This guide shows how to add unirelman to a project with published versions, so that it publishes each version once.

On `publish`, each plugin checks its destination for the current version of each scope, and creates only the [releases](/unirelman/reference/glossary/#release) missing there. See [Stateless publishing](/unirelman/concepts/pipelines/#stateless-publishing).

## Match the tag names

The Git and GitHub plugins look for the tag of each current version: by default, the version for a scope at the repository root (`1.0.0`), and `<scope>@<version>` for other scopes (`@example/core@1.0.0`).

When the existing tags have other names, such as `v1.0.0`, set the same `tagFormat` on both plugins:

```ts title="unirelman.config.ts"
import { createGitPlugin, type GitTagFormat } from "@unirelman/plugin-git";
import { createGitHubPlugin } from "@unirelman/plugin-github";

const tagFormat: GitTagFormat = ({ version }) => `v${version}`;

// ...
plugins: [
  // ...
  createGitPlugin({ tagFormat }),
  createGitHubPlugin({ tagFormat }),
],
```

See [Tag names](/unirelman/reference/plugins/git/#tag-names).

## Release the next version

1. Set up unirelman: see [Get started](/unirelman/introduction/getting-started/).
2. Record your first change with a changeset.
3. Run `version`, then `publish`: the next versions are the first ones unirelman publishes.

With the GitHub Action, push the workflow with your first changeset. The first run opens a release pull request, and publishing starts once you merge it. See [The publish setting](/unirelman/concepts/github-action/#the-publish-setting).

## Related

- [Release a monorepo](/unirelman/guides/monorepo/)
- [Git plugin reference](/unirelman/reference/plugins/git/)
