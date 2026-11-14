import "../helpers/changeset.mock";
import "../helpers/fields.mock";
import { mockedAssertKnownScopes, mockedSerializeChangeset } from "../helpers/changeset.mock";
import { mockedParseLevel, mockedParseMessage, mockedParseScopes } from "../helpers/fields.mock";

import { createCommandRunContext } from "@unirelman/cli/testing/fixtures";
import { createPluginContext, SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./create";
import { createCreateCommand, promptLevel, promptMessage, promptScopes } from "./create";

describe("promptScopes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for the scopes", async () => {
    const { ui } = createCommandRunContext();
    const selectedScopes = [SCOPE_NAMES.BETA];

    vi.mocked(ui.multiselect).mockResolvedValueOnce(selectedScopes);

    await expect(promptScopes(ui, [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA])).resolves.toEqual(
      selectedScopes,
    );
    expect(ui.multiselect).toHaveBeenCalledTimes(1);
    expect(ui.multiselect).toHaveBeenNthCalledWith(1, {
      message: "Select the scopes for this changeset",
      option: "--scopes",
      options: [
        { label: SCOPE_NAMES.ALPHA, value: SCOPE_NAMES.ALPHA },
        { label: SCOPE_NAMES.BETA, value: SCOPE_NAMES.BETA },
      ],
    });
  });
});

describe("promptLevel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for the level", async () => {
    const { ui } = createCommandRunContext();

    vi.mocked(ui.select).mockResolvedValueOnce("major");

    await expect(promptLevel(ui)).resolves.toEqual("major");
    expect(ui.select).toHaveBeenCalledTimes(1);
    expect(ui.select).toHaveBeenNthCalledWith(1, {
      message: "Select the level for this changeset",
      option: "--level",
      options: [
        { label: "patch", value: "patch" },
        { label: "minor", value: "minor" },
        { label: "major", value: "major" },
      ],
    });
  });
});

describe("promptMessage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for the message and trim it", async () => {
    const { ui } = createCommandRunContext();

    vi.mocked(ui.text).mockResolvedValueOnce("  valid text  ");

    await expect(promptMessage(ui)).resolves.toEqual("valid text");
    expect(ui.text).toHaveBeenCalledTimes(1);

    const validate = vi.mocked(ui.text).mock.calls[0]?.[0].validate;

    expect(ui.text).toHaveBeenNthCalledWith(1, {
      message: "Write a short human-readable change message",
      option: "--message",
      validate,
    });
  });

  it("should require a non-blank message in the prompt validator", async () => {
    const { ui } = createCommandRunContext();

    vi.mocked(ui.text).mockResolvedValueOnce("valid text");

    await promptMessage(ui);

    const validate = vi.mocked(ui.text).mock.calls[0]?.[0].validate as (
      value: string,
    ) => string | undefined;

    expect(validate("   ")).toEqual("Message is required");
    expect(validate("ok")).toEqual(undefined);
  });
});

describe("createCreateCommand", () => {
  const promptScopesSpy = vi.spyOn(thisMod, "promptScopes");
  const promptLevelSpy = vi.spyOn(thisMod, "promptLevel");
  const promptMessageSpy = vi.spyOn(thisMod, "promptMessage");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should define the create command", () => {
    const command = createCreateCommand(createPluginContext(), vi.fn(), vi.fn());

    expect(command.meta).toEqual({ name: "create", description: "Create a changeset" });
    expect(command.title).toEqual("Create changeset");
  });

  it("should create a changeset from explicit args", async () => {
    const context = createPluginContext();
    const scopesValue = ` ${SCOPE_NAMES.ALPHA} , ${SCOPE_NAMES.BETA} `;
    const runContext = createCommandRunContext({
      extends: {
        values: { scopes: scopesValue, level: "MiNoR", message: "  Ship feature  " },
      },
    });
    const readCurrentTime = vi.fn().mockReturnValueOnce(1234567890);
    const createRandomId = vi.fn().mockReturnValueOnce("abcdef12-3456-7890-abcd-ef1234567890");
    const command = createCreateCommand(context, readCurrentTime, createRandomId);
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];

    vi.mocked(context.store.resolvePath).mockReturnValueOnce(
      "/repo/.unirelman/changesets/1234567890-abcdef12.md",
    );

    await expect(command.run(runContext)).resolves.toEqual({
      result: {
        path: ".unirelman/changesets/1234567890-abcdef12.md",
        scopes,
        level: "minor",
        message: "Ship feature",
      },
      success: {
        summary: [],
        message: "Changeset created: .unirelman/changesets/1234567890-abcdef12.md",
      },
    });

    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, scopesValue);
    expect(mockedAssertKnownScopes).toHaveBeenCalledTimes(1);
    expect(mockedAssertKnownScopes).toHaveBeenNthCalledWith(1, scopes, Object.keys(context.scopes));
    expect(promptScopesSpy).not.toHaveBeenCalled();
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, "MiNoR");
    expect(promptLevelSpy).not.toHaveBeenCalled();
    expect(mockedParseMessage).toHaveBeenCalledTimes(1);
    expect(mockedParseMessage).toHaveBeenNthCalledWith(1, "  Ship feature  ");
    expect(promptMessageSpy).not.toHaveBeenCalled();
    expect(mockedSerializeChangeset).toHaveBeenCalledTimes(1);
    expect(mockedSerializeChangeset).toHaveBeenNthCalledWith(1, {
      scopes,
      level: "minor",
      message: "Ship feature",
    });
    expect(context.store.write).toHaveBeenCalledTimes(1);
    expect(context.store.write).toHaveBeenNthCalledWith(
      1,
      "1234567890-abcdef12.md",
      `---\nscopes: ${SCOPE_NAMES.ALPHA},${SCOPE_NAMES.BETA}\nlevel: minor\n---\n\nShip feature\n`,
    );
    expect(context.store.resolvePath).toHaveBeenCalledTimes(1);
    expect(context.store.resolvePath).toHaveBeenNthCalledWith(1, "1234567890-abcdef12.md");
    expect(readCurrentTime).toHaveBeenCalledTimes(1);
    expect(createRandomId).toHaveBeenCalledTimes(1);
  });

  it("should create a changeset from interactive prompts", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext();
    const readCurrentTime = vi.fn().mockReturnValueOnce(1000);
    const createRandomId = vi.fn().mockReturnValueOnce("12345678-0000-0000-0000-000000000000");
    const command = createCreateCommand(context, readCurrentTime, createRandomId);

    promptScopesSpy.mockResolvedValueOnce([SCOPE_NAMES.ALPHA]);
    promptLevelSpy.mockResolvedValueOnce("patch");
    promptMessageSpy.mockResolvedValueOnce("message from prompt");

    vi.mocked(context.store.resolvePath).mockReturnValueOnce(
      "/repo/.unirelman/changesets/1000-12345678.md",
    );

    await expect(command.run(runContext)).resolves.toEqual({
      result: {
        path: ".unirelman/changesets/1000-12345678.md",
        scopes: [SCOPE_NAMES.ALPHA],
        level: "patch",
        message: "message from prompt",
      },
      success: {
        summary: [],
        message: "Changeset created: .unirelman/changesets/1000-12345678.md",
      },
    });

    expect(mockedParseScopes).toHaveBeenCalledTimes(1);
    expect(mockedParseScopes).toHaveBeenNthCalledWith(1, undefined);
    expect(mockedAssertKnownScopes).toHaveBeenCalledTimes(1);
    expect(mockedAssertKnownScopes).toHaveBeenNthCalledWith(1, [], Object.keys(context.scopes));
    expect(promptScopesSpy).toHaveBeenCalledTimes(1);
    expect(promptScopesSpy).toHaveBeenNthCalledWith(1, runContext.ui, Object.keys(context.scopes));
    expect(mockedParseLevel).toHaveBeenCalledTimes(1);
    expect(mockedParseLevel).toHaveBeenNthCalledWith(1, undefined);
    expect(promptLevelSpy).toHaveBeenCalledTimes(1);
    expect(promptLevelSpy).toHaveBeenNthCalledWith(1, runContext.ui);
    expect(mockedParseMessage).toHaveBeenCalledTimes(1);
    expect(mockedParseMessage).toHaveBeenNthCalledWith(1, undefined);
    expect(promptMessageSpy).toHaveBeenCalledTimes(1);
    expect(promptMessageSpy).toHaveBeenNthCalledWith(1, runContext.ui);
    expect(mockedSerializeChangeset).toHaveBeenCalledTimes(1);
    expect(mockedSerializeChangeset).toHaveBeenNthCalledWith(1, {
      scopes: [SCOPE_NAMES.ALPHA],
      level: "patch",
      message: "message from prompt",
    });
    expect(context.store.write).toHaveBeenCalledTimes(1);
    expect(context.store.write).toHaveBeenNthCalledWith(
      1,
      "1000-12345678.md",
      `---\nscopes: ${SCOPE_NAMES.ALPHA}\nlevel: patch\n---\n\nmessage from prompt\n`,
    );
  });
});
