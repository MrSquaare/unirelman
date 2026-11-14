---
title: How the GitHub Action works
description: The release pull request flow of the unirelman GitHub Action, and its publish setting.
sidebar:
  order: 3
---

The GitHub Action turns the two pipelines into a pull-request-based workflow: changes accumulate in a release pull request, and merging it publishes. This page explains how it decides what to do.

## On every push

The GitHub Action runs on pushes to your main branch, and does two passes:

1. **Publish pass**: runs `unirelman publish`, then pushes the Git tags it created. If the push merged a release pull request, the versions it released are published here.
2. **Version pass**: creates the release branch from the current commit, and runs `unirelman version` on it.
   - **Changes pending**: force-pushes the release branch and opens the release pull request, or updates it. Its description lists each scope's current and next version.
   - **Nothing pending**: closes the release pull request if one is open.

Publishing first retries a failed publish on the next push, whatever was merged in between.

## The publish setting

Running `publish` on the first push would publish the versions your project already has: for a new project, a version nobody chose to release; for an existing one, possibly duplicate tags and empty GitHub releases.

So the GitHub Action publishes once **publishing is enabled**, as recorded by the [publish setting](/unirelman/reference/glossary/#publish-setting) in `.unirelman/github-action/settings.json`:

```json
{ "publishingEnabled": true }
```

Until publishing is enabled:

- **Changes pending**: the GitHub Action skips the publish pass, and adds a commit enabling publishing to the release pull request. Merging your first release pull request enables publishing, so the first published versions are the ones it releases.
- **Nothing pending**: the GitHub Action opens a release pull request that only enables publishing. Merge it to publish your current versions as they are; ignore it to wait for your first change.

The setting is an explicit file in the repository: you review it in a pull request, and it stays in place when GitHub deletes merged branches.

## Why the GitHub Action runs your CLI

The GitHub Action runs the CLI installed in your repository (`npx --no-install unirelman`). Your configuration and plugins run with the version of unirelman they were written for, and the GitHub Action handles what's specific to GitHub: branches, pushes and pull requests.

## Related

- [Automate releases with GitHub Actions](/unirelman/tutorials/github-action/)
- [GitHub Action reference](/unirelman/reference/integrations/github-action/)
