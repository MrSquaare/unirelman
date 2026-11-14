import { setFailed } from "@actions/core";

import { runAction } from "./main";

try {
  await runAction();
} catch (error) {
  setFailed(error instanceof Error ? error : String(error));
}
