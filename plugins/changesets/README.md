# `@unirelman/plugin-changesets`

unirelman plugin for changesets.

## Table of contents

- [About](#about)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## About

Reads changes from changeset files, and provides the `changesets create` command.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later
2. Set up unirelman: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

### Installation

1. Install the package:

```shell
npm install -D @unirelman/plugin-changesets
```

## Usage

Register the plugin in `unirelman.config.ts`:

```ts
import { createChangesetsPlugin } from "@unirelman/plugin-changesets";

// ...
plugins: [
  // ...
  createChangesetsPlugin(),
],
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/plugins/changesets/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
