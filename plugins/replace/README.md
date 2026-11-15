# `@unirelman/plugin-replace`

unirelman plugin for version references in any file.

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

Replaces text in listed files with the next version of a scope, in the release commit.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 24 or later
2. Set up unirelman: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

### Installation

1. Install the package:

```shell
npm install -D @unirelman/plugin-replace
```

## Usage

Register the plugin in `unirelman.config.ts`:

```ts
import { createReplacePlugin } from "@unirelman/plugin-replace";

// ...
plugins: [
  // ...
  createReplacePlugin({
    files: [
      {
        path: "README.md",
        scope: "my-package",
        search: ({ currentVersion }) => new RegExp(RegExp.escape(`my-package@${currentVersion}`)),
        replace: ({ nextVersion }) => `my-package@${nextVersion}`,
      },
    ],
  }),
],
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/plugins/replace/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
