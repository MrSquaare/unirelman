import { mockedCreatePlainRenderer } from "./plain.mock";
import { mockedWriteJSON } from "./stream.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import { MockRenderer } from "../testing/mocks/renderer";
import { createJSONRenderer } from "./json";

describe("createJSONRenderer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create the plain renderer with the same options", () => {
    mockedCreatePlainRenderer.mockReturnValueOnce(new MockRenderer());

    createJSONRenderer({ verbose: true });

    expect(mockedCreatePlainRenderer).toHaveBeenCalledTimes(1);
    expect(mockedCreatePlainRenderer).toHaveBeenNthCalledWith(1, { verbose: true });
  });

  it("should keep the plain command UI, logger, printing and error", () => {
    const plainRenderer = new MockRenderer();

    mockedCreatePlainRenderer.mockReturnValueOnce(plainRenderer);

    const renderer = createJSONRenderer({ verbose: true });

    expect(renderer.ui).toEqual(plainRenderer.ui);
    expect(renderer.createLogger).toEqual(plainRenderer.createLogger);
    expect(renderer.print).toEqual(plainRenderer.print);
    expect(renderer.printError).toEqual(plainRenderer.printError);
    expect(renderer.error).toEqual(plainRenderer.error);
  });

  it("should render nothing for intro, success, cancellation and failure", () => {
    const plainRenderer = new MockRenderer();

    mockedCreatePlainRenderer.mockReturnValueOnce(plainRenderer);

    const renderer = createJSONRenderer({ verbose: false });

    renderer.intro("Create changeset");
    renderer.success({ summary: ["@scope/a: 1.0.0 → 1.0.1"], message: "Changeset created" });
    renderer.cancel("Operation cancelled");
    renderer.failure("❌ The command failed.");

    expect(plainRenderer.intro).not.toHaveBeenCalled();
    expect(plainRenderer.success).not.toHaveBeenCalled();
    expect(plainRenderer.cancel).not.toHaveBeenCalled();
    expect(plainRenderer.failure).not.toHaveBeenCalled();
    expect(mockedWriteJSON).not.toHaveBeenCalled();
  });

  it("should write the result as JSON", () => {
    mockedCreatePlainRenderer.mockReturnValueOnce(new MockRenderer());

    createJSONRenderer({ verbose: false }).result({ path: "a.md" });

    expect(mockedWriteJSON).toHaveBeenCalledTimes(1);
    expect(mockedWriteJSON).toHaveBeenNthCalledWith(1, { path: "a.md" });
  });
});
