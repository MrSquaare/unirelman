---
title: Configuration
description: The unirelman configuration file, its scopes, and its plugin registrations.
---

## Configuration file

The CLI loads `unirelman.config.*` from the current folder, or the file given with `--config`. The file is TypeScript (`.ts`, `.mts`, `.cts`) or JavaScript (`.js`, `.mjs`, `.cjs`), because plugins are objects created by code. Its folder is the [project root](/unirelman/reference/glossary/#project-root): scope paths are relative to it, and commands run from it.

Node.js loads the file and the local modules it imports, and strips their TypeScript types. Relative imports name the file extension, such as `./my-plugin.ts`, and type-only imports use `import type`.

The default export is the configuration, wrapped in `defineConfig`:

```ts title="unirelman.config.ts"
import { defineConfig } from "@unirelman/cli";

export default defineConfig({
  scopes: {
    // ...
  },
  plugins: [
    // ...
  ],
});
```

`defineConfig` returns the configuration unchanged and infers the scope names, so plugin registrations type-check against the declared scopes.

## `scopes`

**Type:** `Record<string, string>` · **Required**

Maps each [scope](/unirelman/reference/glossary/#scope) name to its folder, relative to the project root.

```ts title="unirelman.config.ts"
scopes: {
  root: "./",
  "@example/core": "packages/core",
},
```

Each scope path is unique and inside the project root.

### Scope names

A scope name:

- Contains only letters, digits, and the characters `@`, `/`, `.`, `_`, and `-`, such as `@example/core`.

## `plugins`

**Type:** `Array<Plugin | { plugin: Plugin; scopes?: string[] }>` · **Required**

The [plugin registrations](/unirelman/reference/glossary/#plugin-registration), in the order their plugins run within each phase. Each entry is either:

- **A plugin**, which applies to every scope:

  ```ts title="unirelman.config.ts"
  createExamplePlugin(),
  ```

- **An object** with the plugin and the scopes it applies to, every scope when `scopes` is omitted:

  ```ts title="unirelman.config.ts"
  {
    plugin: createExamplePlugin(),
    scopes: ["@example/core"],
  },
  ```

## Errors

The CLI validates the configuration when it starts.

| Error                                  | Cause                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CoreInvalidConfigError`               | An unknown key, a wrong type, or a plugin entry that is not a plugin.                                         |
| `CoreEmptyScopesError`                 | `scopes` is empty.                                                                                            |
| `CoreInvalidScopeNameError`            | A scope name has a character outside the [scope name](#scope-names) rules.                                    |
| `CoreScopePathOutsideCwdError`         | A scope path is outside the project root.                                                                     |
| `CoreDuplicateScopePathError`          | Two scopes have the same path.                                                                                |
| `CoreInvalidPluginNameError`           | A plugin name has a character outside the [plugin name](/unirelman/reference/plugin-api/#plugin-names) rules. |
| `CoreEmptyConfigPluginScopesError`     | A registration has an empty `scopes` list.                                                                    |
| `CoreUnknownConfigPluginScopeError`    | A registration lists an undeclared scope.                                                                     |
| `CoreDuplicatePluginRegistrationError` | Two registrations have plugins with the same name.                                                            |
| `CLIReservedCommandNameError`          | A plugin with CLI commands is named `version` or `publish`.                                                   |
| `CoreConflictingPhaseProvidersError`   | Two plugins provide the same one-plugin-per-scope phase, such as `computeNextVersion`, for a scope.           |

Errors of the pipelines are listed in [Plugin API](/unirelman/reference/plugin-api/#errors).

## Related

- [Get started](/unirelman/introduction/getting-started/)
- [Release a monorepo](/unirelman/guides/monorepo/)
