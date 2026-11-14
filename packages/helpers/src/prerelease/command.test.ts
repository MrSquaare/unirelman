import { mockedResolveGroups } from "../group/resolver.mock";
import {
  mockedResolveGroupTargetLabel,
  mockedResolveGroupTargets,
  mockedResolveIndependentScopes,
} from "../group/target.mock";

import { createCommandRunContext } from "@unirelman/cli/testing/fixtures";
import { createPluginContext, SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as thisMod from "./command";
import {
  createPrereleaseCommand,
  parsePrereleaseOptions,
  promptChannel,
  promptPrereleaseTarget,
  resolveAllowedChannels,
  resolvePrereleaseSuccessMessage,
  resolvePrereleaseTarget,
  resolvePrereleaseUpdate,
} from "./command";
import {
  PrereleaseInvalidChannelInStateError,
  PrereleaseInvalidGroupError,
  PrereleaseInvalidScopeError,
  PrereleaseInvalidTargetChannelError,
  PrereleaseNoChannelsConfiguredError,
  PrereleaseOptionRequiredError,
  PrereleaseOptionsConflictError,
} from "./errors";
import { prereleaseStateSchema } from "./types";

describe("parsePrereleaseOptions", () => {
  it("should return enter selection when scope and channel are provided", () => {
    expect(
      parsePrereleaseOptions({ scope: SCOPE_NAMES.ALPHA, channel: "alpha", exit: false }, [
        "--scope",
      ]),
    ).toEqual({
      scope: SCOPE_NAMES.ALPHA,
      group: undefined,
      selection: { action: "enter", channel: "alpha" },
    });
  });

  it("should return exit selection when exit flag is provided with a group", () => {
    expect(
      parsePrereleaseOptions({ group: "product", exit: true }, ["--scope", "--group"]),
    ).toEqual({
      scope: undefined,
      group: "product",
      selection: { action: "exit" },
    });
  });

  it("should return no selection when neither channel nor exit is provided", () => {
    expect(
      parsePrereleaseOptions({ scope: SCOPE_NAMES.ALPHA, channel: "", exit: false }, ["--scope"]),
    ).toEqual({
      scope: SCOPE_NAMES.ALPHA,
      group: undefined,
      selection: undefined,
    });
  });

  it("should return enter selection without target when the command has no target option", () => {
    expect(parsePrereleaseOptions({ channel: "beta" }, [])).toEqual({
      scope: undefined,
      group: undefined,
      selection: { action: "enter", channel: "beta" },
    });
  });

  it("should throw when --scope and --group are both used", () => {
    expect(() =>
      parsePrereleaseOptions({ scope: SCOPE_NAMES.ALPHA, group: "product" }, [
        "--scope",
        "--group",
      ]),
    ).toThrow(new PrereleaseOptionsConflictError("--scope", "--group"));
  });

  it("should throw when --channel is used without a target", () => {
    expect(() => parsePrereleaseOptions({ channel: "alpha" }, ["--scope", "--group"])).toThrow(
      new PrereleaseOptionRequiredError("--channel", "--scope or --group"),
    );
  });

  it("should throw when --exit is used without a target", () => {
    expect(() => parsePrereleaseOptions({ exit: true }, ["--scope"])).toThrow(
      new PrereleaseOptionRequiredError("--exit", "--scope"),
    );
  });

  it("should throw when --channel and --exit are both used", () => {
    expect(() =>
      parsePrereleaseOptions({ scope: SCOPE_NAMES.ALPHA, channel: "beta", exit: true }, [
        "--scope",
      ]),
    ).toThrow(new PrereleaseOptionsConflictError("--channel", "--exit"));
  });
});

describe("resolvePrereleaseTarget", () => {
  const groups = [{ name: "product", scopes: [SCOPE_NAMES.ALPHA] }];

  it("should return the fixed group named by --group", () => {
    expect(
      resolvePrereleaseTarget(groups, [SCOPE_NAMES.BETA], {
        scope: undefined,
        group: "product",
        selection: undefined,
      }),
    ).toEqual({ group: "product", scopes: [SCOPE_NAMES.ALPHA] });
  });

  it("should return the independent scope named by --scope", () => {
    expect(
      resolvePrereleaseTarget(groups, [SCOPE_NAMES.BETA], {
        scope: SCOPE_NAMES.BETA,
        group: undefined,
        selection: undefined,
      }),
    ).toEqual({ group: undefined, scopes: [SCOPE_NAMES.BETA] });
  });

  it("should return no target when no target option is given", () => {
    expect(
      resolvePrereleaseTarget(groups, [SCOPE_NAMES.BETA], {
        scope: undefined,
        group: undefined,
        selection: undefined,
      }),
    ).toEqual(undefined);
  });

  it("should throw when --group names no fixed group", () => {
    expect(() =>
      resolvePrereleaseTarget(groups, [SCOPE_NAMES.BETA], {
        scope: undefined,
        group: "missing",
        selection: undefined,
      }),
    ).toThrow(new PrereleaseInvalidGroupError("missing", ["product"]));
  });

  it("should throw when --scope names a scope outside the independent scopes", () => {
    expect(() =>
      resolvePrereleaseTarget(groups, [SCOPE_NAMES.BETA], {
        scope: SCOPE_NAMES.ALPHA,
        group: undefined,
        selection: undefined,
      }),
    ).toThrow(new PrereleaseInvalidScopeError(SCOPE_NAMES.ALPHA, [SCOPE_NAMES.BETA]));
  });
});

describe("promptPrereleaseTarget", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for a target, showing the channel of the targets in prerelease mode", async () => {
    const { ui } = createCommandRunContext();
    const groupTarget = { group: "product", scopes: [SCOPE_NAMES.ALPHA] };
    const scopeTarget = { group: undefined, scopes: [SCOPE_NAMES.BETA] };

    vi.mocked(ui.select).mockResolvedValueOnce(groupTarget);

    await expect(
      promptPrereleaseTarget(
        ui,
        [groupTarget, scopeTarget],
        { [SCOPE_NAMES.ALPHA]: { channel: "alpha" } },
        ["--scope", "--group"],
      ),
    ).resolves.toEqual(groupTarget);

    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(2);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, groupTarget);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(2, scopeTarget);
    expect(ui.select).toHaveBeenCalledTimes(1);
    expect(ui.select).toHaveBeenNthCalledWith(1, {
      message: "Select prerelease target",
      option: "--scope or --group",
      options: [
        { value: groupTarget, label: `group product (${SCOPE_NAMES.ALPHA}) · alpha` },
        { value: scopeTarget, label: `scope ${SCOPE_NAMES.BETA}` },
      ],
    });
  });
});

describe("resolveAllowedChannels", () => {
  it("should return every channel when the target is in release mode", () => {
    expect(resolveAllowedChannels(["alpha", "beta", "rc"], undefined)).toEqual([
      "alpha",
      "beta",
      "rc",
    ]);
  });

  it("should return the channels after the current channel", () => {
    expect(resolveAllowedChannels(["alpha", "beta", "rc"], { channel: "beta" })).toEqual(["rc"]);
  });

  it("should return no channel when the current channel is the last one", () => {
    expect(resolveAllowedChannels(["alpha", "beta", "rc"], { channel: "rc" })).toEqual([]);
  });

  it("should throw when the current channel is not a configured channel", () => {
    expect(() => resolveAllowedChannels(["alpha", "beta"], { channel: "rc" })).toThrow(
      new PrereleaseInvalidChannelInStateError("rc", ["alpha", "beta"]),
    );
  });
});

describe("promptChannel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for a channel", async () => {
    const { ui } = createCommandRunContext();

    vi.mocked(ui.select).mockResolvedValueOnce({ action: "enter", channel: "beta" });

    await expect(promptChannel(ui, ["alpha", "beta"], false)).resolves.toEqual({
      action: "enter",
      channel: "beta",
    });
    expect(ui.select).toHaveBeenCalledTimes(1);
    expect(ui.select).toHaveBeenNthCalledWith(1, {
      message: "Select a prerelease channel",
      option: "--channel",
      options: [
        { value: { action: "enter", channel: "alpha" }, label: "alpha" },
        { value: { action: "enter", channel: "beta" }, label: "beta" },
      ],
    });
  });

  it("should add the exit option when the target can exit prerelease mode", async () => {
    const { ui } = createCommandRunContext();

    vi.mocked(ui.select).mockResolvedValueOnce({ action: "exit" });

    await expect(promptChannel(ui, ["rc"], true)).resolves.toEqual({ action: "exit" });
    expect(ui.select).toHaveBeenCalledTimes(1);
    expect(ui.select).toHaveBeenNthCalledWith(1, {
      message: "Select a prerelease channel or exit",
      option: "--channel",
      options: [
        { value: { action: "enter", channel: "rc" }, label: "rc" },
        { value: { action: "exit" }, label: "exit" },
      ],
    });
  });
});

describe("resolvePrereleaseUpdate", () => {
  const target = { group: "product", scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA] };

  it("should put every scope of the target on the selected channel", () => {
    expect(
      resolvePrereleaseUpdate(
        { other: { channel: "rc" } },
        target,
        undefined,
        { action: "enter", channel: "alpha" },
        ["alpha", "beta"],
      ),
    ).toEqual({
      state: {
        other: { channel: "rc" },
        [SCOPE_NAMES.ALPHA]: { channel: "alpha" },
        [SCOPE_NAMES.BETA]: { channel: "alpha" },
      },
      output: {
        group: "product",
        scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
        channel: "alpha",
        previousChannel: null,
      },
    });
  });

  it("should move every scope of the target to an upper channel", () => {
    expect(
      resolvePrereleaseUpdate(
        { [SCOPE_NAMES.ALPHA]: { channel: "beta" }, [SCOPE_NAMES.BETA]: { channel: "beta" } },
        target,
        { channel: "beta" },
        { action: "enter", channel: "rc" },
        ["rc"],
      ),
    ).toEqual({
      state: { [SCOPE_NAMES.ALPHA]: { channel: "rc" }, [SCOPE_NAMES.BETA]: { channel: "rc" } },
      output: {
        group: "product",
        scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
        channel: "rc",
        previousChannel: "beta",
      },
    });
  });

  it("should remove every scope of the target from the state on exit", () => {
    expect(
      resolvePrereleaseUpdate(
        {
          other: { channel: "alpha" },
          [SCOPE_NAMES.ALPHA]: { channel: "beta" },
          [SCOPE_NAMES.BETA]: { channel: "beta" },
        },
        target,
        { channel: "beta" },
        { action: "exit" },
        ["rc"],
      ),
    ).toEqual({
      state: { other: { channel: "alpha" } },
      output: {
        group: "product",
        scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
        channel: null,
        previousChannel: "beta",
      },
    });
  });

  it("should change nothing when exiting a target in release mode", () => {
    expect(resolvePrereleaseUpdate({}, target, undefined, { action: "exit" }, ["alpha"])).toEqual({
      state: undefined,
      output: {
        group: "product",
        scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
        channel: null,
        previousChannel: null,
      },
    });
  });

  it("should output no group for an independent scope target", () => {
    expect(
      resolvePrereleaseUpdate(
        {},
        { group: undefined, scopes: [SCOPE_NAMES.ALPHA] },
        undefined,
        { action: "enter", channel: "alpha" },
        ["alpha"],
      ),
    ).toEqual({
      state: { [SCOPE_NAMES.ALPHA]: { channel: "alpha" } },
      output: { group: null, scopes: [SCOPE_NAMES.ALPHA], channel: "alpha", previousChannel: null },
    });
  });

  it("should throw when the selected channel is not an allowed channel", () => {
    expect(() =>
      resolvePrereleaseUpdate(
        {},
        target,
        { channel: "beta" },
        { action: "enter", channel: "alpha" },
        ["rc"],
      ),
    ).toThrow(new PrereleaseInvalidTargetChannelError("alpha", ["rc"]));
  });
});

describe("resolvePrereleaseSuccessMessage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should describe entering prerelease mode", () => {
    const output = {
      group: "product",
      scopes: ["@scope/a"],
      channel: "beta",
      previousChannel: null,
    };

    expect(resolvePrereleaseSuccessMessage(output)).toEqual(
      "Configured prerelease for group product (@scope/a): beta",
    );
    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, {
      group: output.group ?? undefined,
      scopes: output.scopes,
    });
  });

  it("should describe moving to an upper channel", () => {
    const output = { group: null, scopes: ["root"], channel: "rc", previousChannel: "beta" };

    expect(resolvePrereleaseSuccessMessage(output)).toEqual(
      "Updated prerelease for scope root: beta → rc",
    );
    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, {
      group: output.group ?? undefined,
      scopes: output.scopes,
    });
  });

  it("should describe exiting prerelease mode", () => {
    const output = { group: null, scopes: ["root"], channel: null, previousChannel: "beta" };

    expect(resolvePrereleaseSuccessMessage(output)).toEqual("Exited prerelease for scope root");
    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, {
      group: output.group ?? undefined,
      scopes: output.scopes,
    });
  });

  it("should describe exiting a target in release mode", () => {
    const output = {
      group: "product",
      scopes: ["@scope/a", "@scope/b"],
      channel: null,
      previousChannel: null,
    };

    expect(resolvePrereleaseSuccessMessage(output)).toEqual(
      "No prerelease to exit for group product (@scope/a, @scope/b)",
    );
    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, {
      group: output.group ?? undefined,
      scopes: output.scopes,
    });
  });
});

describe("createPrereleaseCommand", () => {
  const parsePrereleaseOptionsSpy = vi.spyOn(thisMod, "parsePrereleaseOptions");
  const resolvePrereleaseTargetSpy = vi.spyOn(thisMod, "resolvePrereleaseTarget");
  const promptPrereleaseTargetSpy = vi.spyOn(thisMod, "promptPrereleaseTarget");
  const resolveAllowedChannelsSpy = vi.spyOn(thisMod, "resolveAllowedChannels");
  const promptChannelSpy = vi.spyOn(thisMod, "promptChannel");
  const resolvePrereleaseUpdateSpy = vi.spyOn(thisMod, "resolvePrereleaseUpdate");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should define a scope option for independent scopes", () => {
    const context = createPluginContext();
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: ["alpha"],
      fixed: false,
    });

    expect(command.meta).toEqual({ name: "pre", description: "Put scopes in prerelease mode" });
    expect(command.title).toEqual("Configure prerelease");
    expect(command.options).toEqual({
      scope: { type: "string", description: "Independent scope to put in prerelease mode" },
      channel: { type: "string", description: "Prerelease channel" },
      exit: { type: "boolean", description: "Exit prerelease mode" },
    });
    expect(mockedResolveGroupTargets).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroups).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroups).toHaveBeenNthCalledWith(1, false, Object.keys(context.scopes));
    expect(mockedResolveIndependentScopes).toHaveBeenCalledTimes(1);
    expect(mockedResolveIndependentScopes).toHaveBeenNthCalledWith(
      1,
      [],
      [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
    );
    expect(mockedResolveGroupTargets).toHaveBeenNthCalledWith(
      1,
      [],
      [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
    );
  });

  it("should define scope and group options for named groups with independent scopes", () => {
    const command = createPrereleaseCommand(createPluginContext(), {
      prereleaseChannels: ["alpha"],
      fixed: { product: [SCOPE_NAMES.ALPHA] },
    });

    expect(command.options).toEqual({
      scope: { type: "string", description: "Independent scope to put in prerelease mode" },
      group: { type: "string", description: "Group to put in prerelease mode" },
      channel: { type: "string", description: "Prerelease channel" },
      exit: { type: "boolean", description: "Exit prerelease mode" },
    });
    expect(mockedResolveGroupTargets).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargets).toHaveBeenNthCalledWith(
      1,
      [{ name: "product", scopes: [SCOPE_NAMES.ALPHA] }],
      [SCOPE_NAMES.BETA],
    );
  });

  it("should define the group option when the plugin has a single group", () => {
    const groups = [{ name: "all", scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA] }];
    const command = createPrereleaseCommand(createPluginContext(), {
      prereleaseChannels: ["alpha"],
      fixed: true,
    });

    expect(command.options).toEqual({
      group: { type: "string", description: "Group to put in prerelease mode" },
      channel: { type: "string", description: "Prerelease channel" },
      exit: { type: "boolean", description: "Exit prerelease mode" },
    });
    expect(mockedResolveGroupTargets).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargets).toHaveBeenNthCalledWith(1, groups, []);
  });

  it("should apply the target and the channel given as options", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext({
      extends: { values: { scope: SCOPE_NAMES.BETA, channel: "alpha" } },
    });
    const groups = [{ name: "product", scopes: [SCOPE_NAMES.ALPHA] }];
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: ["alpha", "beta"],
      fixed: { product: [SCOPE_NAMES.ALPHA] },
    });
    const target = { group: undefined, scopes: [SCOPE_NAMES.BETA] };

    vi.mocked(context.store.readJSON).mockResolvedValueOnce({});

    await expect(command.run(runContext)).resolves.toEqual({
      result: { ...target, group: null, channel: "alpha", previousChannel: null },
      success: {
        summary: [],
        message: `Configured prerelease for scope ${SCOPE_NAMES.BETA}: alpha`,
      },
    });

    expect(parsePrereleaseOptionsSpy).toHaveBeenCalledTimes(1);
    expect(parsePrereleaseOptionsSpy).toHaveBeenNthCalledWith(
      1,
      { scope: SCOPE_NAMES.BETA, group: undefined, channel: "alpha", exit: undefined },
      ["--scope", "--group"],
    );
    expect(context.store.readJSON).toHaveBeenCalledTimes(1);
    expect(context.store.readJSON).toHaveBeenNthCalledWith(
      1,
      "prerelease.json",
      prereleaseStateSchema,
      {},
    );
    expect(resolvePrereleaseTargetSpy).toHaveBeenCalledTimes(1);
    expect(resolvePrereleaseTargetSpy).toHaveBeenNthCalledWith(1, groups, [SCOPE_NAMES.BETA], {
      scope: SCOPE_NAMES.BETA,
      group: undefined,
      selection: { action: "enter", channel: "alpha" },
    });
    expect(promptPrereleaseTargetSpy).not.toHaveBeenCalled();
    expect(resolveAllowedChannelsSpy).toHaveBeenCalledTimes(1);
    expect(resolveAllowedChannelsSpy).toHaveBeenNthCalledWith(1, ["alpha", "beta"], undefined);
    expect(promptChannelSpy).not.toHaveBeenCalled();
    expect(resolvePrereleaseUpdateSpy).toHaveBeenCalledTimes(1);
    expect(resolvePrereleaseUpdateSpy).toHaveBeenNthCalledWith(
      1,
      {},
      target,
      undefined,
      { action: "enter", channel: "alpha" },
      ["alpha", "beta"],
    );
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {
      [SCOPE_NAMES.BETA]: { channel: "alpha" },
    });
  });

  it("should prompt for the target and the channel when options are missing", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext();
    const groups = [{ name: "product", scopes: [SCOPE_NAMES.ALPHA] }];
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: ["alpha", "beta"],
      fixed: { product: [SCOPE_NAMES.ALPHA] },
    });
    const target = { group: "product", scopes: [SCOPE_NAMES.ALPHA] };
    const state = { [SCOPE_NAMES.ALPHA]: { channel: "alpha" } };

    vi.mocked(context.store.readJSON).mockResolvedValueOnce(state);
    promptPrereleaseTargetSpy.mockResolvedValueOnce(target);
    promptChannelSpy.mockResolvedValueOnce({ action: "exit" });

    await expect(command.run(runContext)).resolves.toEqual({
      result: { ...target, channel: null, previousChannel: "alpha" },
      success: {
        summary: [],
        message: `Exited prerelease for group product (${SCOPE_NAMES.ALPHA})`,
      },
    });

    expect(resolvePrereleaseTargetSpy).toHaveBeenCalledTimes(1);
    expect(resolvePrereleaseTargetSpy).toHaveBeenNthCalledWith(1, groups, [SCOPE_NAMES.BETA], {
      scope: undefined,
      group: undefined,
      selection: undefined,
    });
    expect(promptPrereleaseTargetSpy).toHaveBeenCalledTimes(1);
    expect(promptPrereleaseTargetSpy).toHaveBeenNthCalledWith(
      1,
      runContext.ui,
      [target, { group: undefined, scopes: [SCOPE_NAMES.BETA] }],
      state,
      ["--scope", "--group"],
    );
    expect(resolveAllowedChannelsSpy).toHaveBeenCalledTimes(1);
    expect(resolveAllowedChannelsSpy).toHaveBeenNthCalledWith(1, ["alpha", "beta"], {
      channel: "alpha",
    });
    expect(promptChannelSpy).toHaveBeenCalledTimes(1);
    expect(promptChannelSpy).toHaveBeenNthCalledWith(1, runContext.ui, ["beta"], true);
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {});
  });

  it("should use the single target without target option, and write nothing when nothing changes", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext({ extends: { values: { exit: true } } });
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: ["alpha"],
      fixed: true,
    });

    vi.mocked(context.store.readJSON).mockResolvedValueOnce({});

    await expect(command.run(runContext)).resolves.toEqual({
      result: { group: "all", scopes, channel: null, previousChannel: null },
      success: {
        summary: [],
        message: `No prerelease to exit for group all (${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA})`,
      },
    });

    expect(parsePrereleaseOptionsSpy).toHaveBeenCalledTimes(1);
    expect(parsePrereleaseOptionsSpy).toHaveBeenNthCalledWith(
      1,
      { group: undefined, channel: undefined, exit: true },
      [],
    );
    expect(resolvePrereleaseTargetSpy).toHaveBeenCalledTimes(1);
    expect(resolvePrereleaseTargetSpy).toHaveBeenNthCalledWith(1, [{ name: "all", scopes }], [], {
      scope: undefined,
      group: undefined,
      selection: { action: "exit" },
    });
    expect(promptPrereleaseTargetSpy).not.toHaveBeenCalled();
    expect(resolveAllowedChannelsSpy).not.toHaveBeenCalled();
    expect(promptChannelSpy).not.toHaveBeenCalled();
    expect(resolvePrereleaseUpdateSpy).toHaveBeenCalledTimes(1);
    expect(resolvePrereleaseUpdateSpy).toHaveBeenNthCalledWith(
      1,
      {},
      { group: "all", scopes },
      undefined,
      { action: "exit" },
      [],
    );
    expect(context.store.writeJSON).not.toHaveBeenCalled();
  });

  it("should exit prerelease mode when the current channel is no longer configured", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext({ extends: { values: { exit: true } } });
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: ["beta"],
      fixed: true,
    });

    vi.mocked(context.store.readJSON).mockResolvedValueOnce({
      [SCOPE_NAMES.ALPHA]: { channel: "alpha" },
      [SCOPE_NAMES.BETA]: { channel: "alpha" },
    });

    await expect(command.run(runContext)).resolves.toEqual({
      result: { group: "all", scopes, channel: null, previousChannel: "alpha" },
      success: {
        summary: [],
        message: `Exited prerelease for group all (${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA})`,
      },
    });

    expect(resolveAllowedChannelsSpy).not.toHaveBeenCalled();
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {});
  });

  it("should exit prerelease mode when no channels are configured", async () => {
    const context = createPluginContext();
    const runContext = createCommandRunContext({ extends: { values: { exit: true } } });
    const scopes = [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA];
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: [],
      fixed: true,
    });

    vi.mocked(context.store.readJSON).mockResolvedValueOnce({
      [SCOPE_NAMES.ALPHA]: { channel: "alpha" },
      [SCOPE_NAMES.BETA]: { channel: "alpha" },
    });

    await expect(command.run(runContext)).resolves.toEqual({
      result: { group: "all", scopes, channel: null, previousChannel: "alpha" },
      success: {
        summary: [],
        message: `Exited prerelease for group all (${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA})`,
      },
    });

    expect(resolveAllowedChannelsSpy).not.toHaveBeenCalled();
    expect(context.store.writeJSON).toHaveBeenCalledTimes(1);
    expect(context.store.writeJSON).toHaveBeenNthCalledWith(1, "prerelease.json", {});
  });

  it("should throw when no channels are configured", async () => {
    const context = createPluginContext();
    const command = createPrereleaseCommand(context, {
      prereleaseChannels: [],
      fixed: false,
    });

    await expect(command.run(createCommandRunContext())).rejects.toThrow(
      new PrereleaseNoChannelsConfiguredError(),
    );

    expect(parsePrereleaseOptionsSpy).toHaveBeenCalledTimes(1);
    expect(parsePrereleaseOptionsSpy).toHaveBeenNthCalledWith(
      1,
      { scope: undefined, channel: undefined, exit: undefined },
      ["--scope"],
    );
    expect(context.store.readJSON).not.toHaveBeenCalled();
  });
});
