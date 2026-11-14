import { join } from "node:path";

import { STORE_ROOT_DIR } from "../constants";
import { FS } from "../fs";

export class Store extends FS {
  constructor(cwd: string, subDir?: string) {
    super(cwd, join(STORE_ROOT_DIR, subDir ?? ""));
  }
}
