# `@unirelman/plugin-calver`

unirelman plugin for calendar versioning.

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

Computes next versions with calendar versioning, with prerelease channels.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later
2. Set up unirelman: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

### Installation

1. Install the package:

```shell
npm install -D @unirelman/plugin-calver
```

## Usage

Register the plugin in `unirelman.config.ts`:

```ts
import { createCalverPlugin } from "@unirelman/plugin-calver";

// ...
plugins: [
  // ...
  createCalverPlugin(),
],
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/plugins/calver/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
