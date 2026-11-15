# unirelman

Universal release manager: version, changelog and publish any project, from a single package to a monorepo.

## Table of contents

- [About](#about)
  - [Built with](#built-with)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## About

You describe your changes in small files called changesets. unirelman turns them into the next version of each package, writes the changelog, commits the release, then publishes it: npm packages, Git tags, and GitHub releases. Every step is a plugin.

> [!CAUTION]
> unirelman is under active development: new versions may introduce breaking changes.

### Built with

- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [Zod](https://zod.dev/)

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later

### Installation

1. Install the CLI, core and the plugins you need:

```shell
npm install -D @unirelman/cli @unirelman/core @unirelman/plugin-changesets @unirelman/plugin-changelog @unirelman/plugin-npm @unirelman/plugin-git @unirelman/plugin-semver
```

2. Configure it: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/).

## Usage

See the available commands:

```shell
npx unirelman --help
```

See the [documentation](https://mrsquaare.github.io/unirelman/) for tutorials, how-to guides, reference, and explanations.

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](CONTRIBUTING.md).

## Security

See the [Security Policy](SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](LICENSE) for more information.
