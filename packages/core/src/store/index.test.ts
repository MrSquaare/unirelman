import { describe, expect, it } from "vitest";

import { Store } from ".";
import { CONFIG_CWD } from "../testing/fixtures/constants";

describe("Store", () => {
  describe("constructor", () => {
    it("should root store under store directory and sub directory", () => {
      const store = new Store(CONFIG_CWD, "subdir");

      expect(store["dirPath"]).toEqual(`${CONFIG_CWD}/.unirelman/subdir`);
    });

    it("should root store under store directory when sub directory is omitted", () => {
      const store = new Store(CONFIG_CWD);

      expect(store["dirPath"]).toEqual(`${CONFIG_CWD}/.unirelman`);
    });
  });
});
