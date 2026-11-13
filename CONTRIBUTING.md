# Contributing Guide

## Table of Contents

- [Guidelines](#guidelines)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Development](#development)

## Guidelines

Read the [Guidelines](GUIDELINES.md) before opening an issue or a pull request.

## Getting started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (version in `engines.node` of [package.json](package.json))
2. Install [pnpm](https://pnpm.io/installation) (version in [package.json](package.json))

### Installation

1. Clone the repository:

```shell
git clone https://github.com/MrSquaare/unirelman.git
```

2. Enter the repository:

```shell
cd unirelman
```

3. Install the dependencies:

```shell
pnpm install
```

## Development

Build the packages:

```shell
pnpm build
```

Type check the code:

```shell
pnpm typecheck
```

Lint and check the format of the code:

```shell
pnpm check
```

Fix the lint and format issues:

```shell
pnpm check:fix
```

Run the tests:

```shell
pnpm test
```
