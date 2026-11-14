# @unirelman/plugin-npm

unirelman plugin for npm.

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

Reads and writes versions in `package.json`, and publishes packages to the npm registry.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later
2. Set up unirelman: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

### Installation

1. Install the package:

```shell
npm install -D @unirelman/plugin-npm
```

## Usage

Register the plugin in `unirelman.config.ts`:

```ts
import { createNpmPlugin } from "@unirelman/plugin-npm";

// ...
plugins: [
  // ...
  createNpmPlugin(),
],
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/plugins/npm/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
