const crypto = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const { syncBuiltinESMExports } = require("node:module");

const randomStateFilePath = process.env.UNIRELMAN_TEST_RANDOM_FILE;

if (randomStateFilePath) {
  crypto.randomUUID = () => {
    const counter = Number(readFileSync(randomStateFilePath, "utf8")) + 1;

    writeFileSync(randomStateFilePath, String(counter));

    return `${counter.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
  };

  syncBuiltinESMExports();
}
