# @unirelman/plugin-git

unirelman plugin for Git.

## Table of Contents

- [About](#about)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## About

Commits the release files on version, and tags the published versions.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later
2. Set up unirelman: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

### Installation

1. Install the package:

```shell
npm install -D @unirelman/plugin-git
```

## Usage

Register the plugin in `unirelman.config.ts`:

```ts
import { createGitPlugin } from "@unirelman/plugin-git";

// ...
plugins: [
  // ...
  createGitPlugin(),
],
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/plugins/git/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
