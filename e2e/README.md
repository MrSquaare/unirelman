# End-to-end tests

The end-to-end tests run the built CLI and the built GitHub Action against real git and the real `npm` and `pnpm`, with fake npm registry and GitHub API servers. They cover what unit tests cannot: real tools, a real configuration file, several plugins together, and the GitHub Action.

## Harness

- `lib/workspace.ts`: a git repository built from files, where the CLI runs. It knows nothing about plugins.
- `lib/layout.ts` and `lib/config.ts`: build those files from a description of the packages and of the configuration.
- `lib/npm-registry.ts` and `lib/github-server.ts`: the fake servers, which report what was published.
- `lib/readers.ts`: read plugin outputs, such as a `package.json` version or a changelog, from git.

Each test asserts the facts its title names. Snapshots are kept for a few golden flows and for outputs whose full text is the contract: JSON output, usage and error messages.

## Coverage

| Capability                                                                  | Suite                        |
| --------------------------------------------------------------------------- | ---------------------------- |
| Version then publish, pending changesets, dry run, publishing again         | `release.test.ts`            |
| Publishing again after a partial failure                                    | `release.test.ts`            |
| Prerelease channels: enter, iterate, upper channel, exit, groups            | `prerelease.test.ts`         |
| Independent scopes and schemes, root scope, fixed scopes, groups            | `monorepo.test.ts`           |
| Usage, an unknown option, prompts outside a terminal                        | `cli.test.ts`                |
| Release pull request and publish flows, root and fixed layouts              | `github-action.test.ts`      |
| CalVer day and month granularity, prerelease exits, future dates            | `plugins/calver.test.ts`     |
| Changelog headers and multiline messages                                    | `plugins/changelog.test.ts`  |
| Changeset JSON output and scope deduplication                               | `plugins/changesets.test.ts` |
| Release commit contents, commit message, annotated tags                     | `plugins/git.test.ts`        |
| Release notes, drafts, latest release, shared tag format                    | `plugins/github.test.ts`     |
| Dist-tags, rejected credentials, pnpm workspace dependencies and dev ranges | `plugins/npm.test.ts`        |
| File references, missing matches                                            | `plugins/replace.test.ts`    |

`teardown` is covered by core's unit tests only: no built-in plugin implements it.
