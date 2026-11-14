import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { CommandRunContext } from "../../types/command";

import { MockCommandUI } from "../mocks/ui";

export const createCommandRunContext = defineObjectGenerator<CommandRunContext>(() => ({
  values: {},
  ui: new MockCommandUI(),
}));
