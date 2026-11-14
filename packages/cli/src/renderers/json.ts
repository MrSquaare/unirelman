import type { Renderer } from "../types/renderer";

import { createPlainRenderer } from "./plain";
import { writeJSON } from "./stream";

export type JSONRendererOptions = {
  readonly verbose: boolean;
};

export const createJSONRenderer = (options: JSONRendererOptions): Renderer => {
  return {
    ...createPlainRenderer(options),
    intro: () => undefined,
    result: (value) => writeJSON(value),
    success: () => undefined,
    cancel: () => undefined,
    failure: () => undefined,
  };
};
