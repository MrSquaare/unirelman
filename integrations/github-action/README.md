# unirelman GitHub Action

Keeps a release pull request up to date, and publishes when you merge it.

## Table of contents

- [About](#about)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## About

Runs `unirelman publish`, then `unirelman version` on a release branch, on every push to your main branch.

## Getting started

### Prerequisites

1. Install unirelman in your repository: see [Get started](https://mrsquaare.github.io/unirelman/introduction/getting-started/)

## Usage

Add the step after installing your dependencies:

```yaml
- uses: MrSquaare/unirelman@v0.1.0-alpha.2
```

See the [documentation](https://mrsquaare.github.io/unirelman/reference/integrations/github-action/).

## Contributing

Bug reports, feature requests, and pull requests are welcome.
See the [Contributing Guide](../../CONTRIBUTING.md).

## Security

See the [Security Policy](../../SECURITY.md).

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
See [LICENSE](../../LICENSE) for more information.
