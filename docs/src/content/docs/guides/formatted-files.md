---
title: Keep generated files formatted
description: Make the files unirelman writes pass the format check of your project.
sidebar:
  order: 9
---

This guide shows how to keep the files unirelman writes, such as changelogs and changesets, passing the format check of your project.

## Know the generated format

unirelman writes files in the default style of common formatters, such as Prettier and oxfmt:

| File                                   | Format                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `CHANGELOG.md`, changesets             | Markdown with a blank line around headings, lists and front matter.          |
| `package.json`, `.unirelman/**/*.json` | JSON indented with two spaces. `package.json` keeps the order of its fields. |

Every file ends with a newline. With default formatter settings, the generated files pass the check as written.

## Ignore the generated files

When the formatter of your project has another style, such as tabs or another Markdown style, exclude the generated files from it:

- **oxfmt**, in `oxfmt.config.ts`:

  ```ts title="oxfmt.config.ts"
  import { defineConfig } from "oxfmt";

  export default defineConfig({
    ignorePatterns: ["CHANGELOG.md", ".unirelman/"],
  });
  ```

- **Prettier**, in `.prettierignore`:

  ```txt title=".prettierignore"
  CHANGELOG.md
  .unirelman/
  ```

Both follow `.gitignore` rules, so `CHANGELOG.md` also matches the changelog of each scope in `scope` mode.

## Related

- [Changelog plugin reference](/unirelman/reference/plugins/changelog/#format)
- [Changesets plugin reference](/unirelman/reference/plugins/changesets/#changeset-format)
