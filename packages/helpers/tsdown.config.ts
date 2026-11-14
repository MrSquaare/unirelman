import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "git/index": "src/git/index.ts",
    "group/index": "src/group/index.ts",
    "prerelease/index": "src/prerelease/index.ts",
    "versioning/index": "src/versioning/index.ts",
  },
});
