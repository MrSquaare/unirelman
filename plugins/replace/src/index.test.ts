import { mockedResolveReplacePluginOptions } from "./helpers/options.mock";
import { mockedCreateGenerateFileOperationsPhase } from "./phases/generate-file-operations.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createReplacePlugin } from "./index";

describe("createReplacePlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create the plugin with its resolved options", () => {
    const file = {
      path: "README.md",
      scope: "@scope/a",
      search: /my-package@\d+\.\d+\.\d+/,
      replace: () => "my-package@1.0.1",
    };
    const phase = vi.fn();

    mockedCreateGenerateFileOperationsPhase.mockReturnValueOnce(phase);

    expect(createReplacePlugin({ files: [file] })).toEqual({
      name: "replace",
      generateFileOperations: phase,
    });
    expect(mockedResolveReplacePluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveReplacePluginOptions).toHaveBeenNthCalledWith(1, { files: [file] });
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateGenerateFileOperationsPhase).toHaveBeenNthCalledWith(1, {
      files: [{ ...file, allowNoMatch: false }],
    });
  });
});
