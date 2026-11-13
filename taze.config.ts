import { defineConfig } from "taze";

export default defineConfig({
  recursive: true,
  packageMode: {
    "@types/node": "minor",
    typescript: "minor",
  },
});
