---
title: GitHub Action
description: Inputs, outputs, permissions, and behavior of the unirelman GitHub Action.
---

The GitHub Action keeps a [release pull request](/unirelman/reference/glossary/#release-pull-request) up to date with the pending changes, and publishes when you merge it. See [How the GitHub Action works](/unirelman/concepts/github-action/).

```yaml
- uses: MrSquaare/unirelman@v0.1.0-alpha.2
```

## Requirements

- **Checkout** with the full history and tags: `actions/checkout` with `fetch-depth: 0`.
- **Node.js and dependencies installed** before the GitHub Action: it runs the CLI installed in your repository.
- **The Git plugin** in your configuration: it creates the release commit the GitHub Action pushes.
- **Permissions**: `contents: write` and `pull-requests: write`, plus `id-token: write` for npm trusted publishing.
- **Repository setting**: the **Allow GitHub Actions to create and approve pull requests** setting.

## Inputs

| Input               | Default                         | Description                                                                                                       |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `command`           | `npx --no-install unirelman`    | Command that runs the unirelman CLI installed in the repository.                                                  |
| `working-directory` | `.`                             | Folder the CLI runs in: the folder of the configuration file, and of the publish setting.                         |
| `github-token`      | `${{ github.token }}`           | Token used to manage the release pull request. Also passed to the CLI as the `GITHUB_TOKEN` environment variable. |
| `base-branch`       | `${{ github.ref_name }}`        | Branch the release pull request targets.                                                                          |
| `branch`            | `unirelman/release`             | Branch holding the release commit. Force-pushed on every run.                                                     |
| `pr-title`          | `chore(release): bump versions` | Title of the release pull request.                                                                                |

## Several configurations

A repository with several configuration files runs the GitHub Action once per configuration, each in its own job, with its own `working-directory`, `branch` and `pr-title`:

```yaml
strategy:
  matrix:
    include:
      - working-directory: .
        branch: unirelman/release
      - working-directory: tools/cli
        branch: unirelman/release-cli
steps:
  # ...
  - uses: MrSquaare/unirelman@v0.1.0-alpha.2
    with:
      working-directory: ${{ matrix.working-directory }}
      branch: ${{ matrix.branch }}
```

Each configuration gets its own release pull request and its own publish setting.

## Outputs

| Output      | Description                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pr-number` | Number of the release pull request, when the run creates or updates it.                                                     |
| `releases`  | The `releases` object of the [`publish` JSON document](/unirelman/reference/cli/#publish), as JSON, when the run publishes. |

## Environment

- The CLI runs with the GitHub Action's environment, plus the `GITHUB_TOKEN` environment variable set to the `github-token` input. Environment variables you set on the step, such as `NODE_AUTH_TOKEN`, are available to plugins.
- Pushes use the credentials stored by `actions/checkout`, set by its `token` input.
- When Git has no user configured, the GitHub Action commits as `github-actions[bot]`.

## Files

| Path                                                         | Description                                                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<working-directory>/.unirelman/github-action/settings.json` | The [publish setting](/unirelman/reference/glossary/#publish-setting): `{ "publishingEnabled": true }` once publishing is enabled. Written by the GitHub Action in a release pull request. |

## Errors

| Error                             | Cause                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| `ActionMissingReleaseCommitError` | `unirelman version` changes files without creating a release commit. |

## Related

- [Automate releases with GitHub Actions](/unirelman/tutorials/github-action/)
- [How the GitHub Action works](/unirelman/concepts/github-action/)
