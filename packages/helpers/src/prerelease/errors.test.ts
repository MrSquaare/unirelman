import { describe, expect, it } from "vitest";

import {
  PrereleaseDowngradeChannelError,
  PrereleaseError,
  PrereleaseInvalidChannelInStateError,
  PrereleaseInvalidCurrentChannelError,
  PrereleaseInvalidGroupError,
  PrereleaseInvalidScopeError,
  PrereleaseInvalidTargetChannelError,
  PrereleaseNoChannelsConfiguredError,
  PrereleaseOptionRequiredError,
  PrereleaseOptionsConflictError,
  PrereleaseStateMismatchError,
} from "./errors";

describe("PrereleaseError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new PrereleaseError("prerelease failure");

      expect(error.message).toEqual("prerelease failure");
      expect(error.name).toEqual("PrereleaseError");
    });

    it("should construct with a cause", () => {
      const cause = new Error("root cause");
      const error = new PrereleaseError("prerelease failure", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("PrereleaseOptionRequiredError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseOptionRequiredError("--channel", "--scope");

      expect(error.message).toEqual("Option --channel requires --scope");
      expect(error.name).toEqual("PrereleaseOptionRequiredError");
      expect(error.option).toEqual("--channel");
      expect(error.requiredOption).toEqual("--scope");
    });
  });
});

describe("PrereleaseOptionsConflictError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseOptionsConflictError("--channel", "--exit");

      expect(error.message).toEqual("Options --channel and --exit cannot be used together");
      expect(error.name).toEqual("PrereleaseOptionsConflictError");
      expect(error.options).toEqual(["--channel", "--exit"]);
    });
  });
});

describe("PrereleaseInvalidChannelInStateError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseInvalidChannelInStateError("gamma", ["alpha", "beta"]);

      expect(error.message).toEqual(
        'Unknown prerelease channel "gamma" in state. Known channels: alpha, beta',
      );
      expect(error.name).toEqual("PrereleaseInvalidChannelInStateError");
      expect(error.channel).toEqual("gamma");
      expect(error.knownChannels).toEqual(["alpha", "beta"]);
    });
  });
});

describe("PrereleaseNoChannelsConfiguredError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseNoChannelsConfiguredError();

      expect(error.message).toEqual("No prerelease channels configured");
      expect(error.name).toEqual("PrereleaseNoChannelsConfiguredError");
    });
  });
});

describe("PrereleaseInvalidScopeError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseInvalidScopeError("@scope/c", ["@scope/a", "@scope/b"]);

      expect(error.message).toEqual(
        'Unknown independent scope "@scope/c". Known independent scopes: @scope/a, @scope/b',
      );
      expect(error.name).toEqual("PrereleaseInvalidScopeError");
      expect(error.scopeName).toEqual("@scope/c");
      expect(error.knownScopeNames).toEqual(["@scope/a", "@scope/b"]);
    });
  });
});

describe("PrereleaseInvalidGroupError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseInvalidGroupError("ui", ["core", "tools"]);

      expect(error.message).toEqual('Unknown group "ui". Known groups: core, tools');
      expect(error.name).toEqual("PrereleaseInvalidGroupError");
      expect(error.groupName).toEqual("ui");
      expect(error.knownGroupNames).toEqual(["core", "tools"]);
    });
  });
});

describe("PrereleaseInvalidCurrentChannelError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseInvalidCurrentChannelError("gamma", ["alpha", "beta"]);

      expect(error.message).toEqual(
        'Unknown current prerelease channel "gamma". Known channels: alpha, beta',
      );
      expect(error.name).toEqual("PrereleaseInvalidCurrentChannelError");
      expect(error.channel).toEqual("gamma");
      expect(error.knownChannels).toEqual(["alpha", "beta"]);
    });
  });
});

describe("PrereleaseInvalidTargetChannelError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseInvalidTargetChannelError("alpha", ["rc"]);

      expect(error.message).toEqual(
        'Prerelease channel "alpha" is not allowed. Allowed channels: rc',
      );
      expect(error.name).toEqual("PrereleaseInvalidTargetChannelError");
      expect(error.channel).toEqual("alpha");
      expect(error.allowedChannels).toEqual(["rc"]);
    });
  });
});

describe("PrereleaseDowngradeChannelError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseDowngradeChannelError("beta", "alpha", ["alpha", "beta"]);

      expect(error.message).toEqual(
        'Cannot downgrade prerelease channel from "beta" to "alpha". Channel order: alpha < beta',
      );
      expect(error.name).toEqual("PrereleaseDowngradeChannelError");
      expect(error.currentChannel).toEqual("beta");
      expect(error.targetChannel).toEqual("alpha");
      expect(error.channelOrder).toEqual(["alpha", "beta"]);
    });
  });
});

describe("PrereleaseStateMismatchError", () => {
  describe("constructor", () => {
    it("should construct with its message, name and properties", () => {
      const error = new PrereleaseStateMismatchError({ "@scope/a": "beta", "@scope/b": undefined });

      expect(error.message).toEqual(
        "Fixed scopes must share the same prerelease state: @scope/a (beta), @scope/b (no prerelease)",
      );
      expect(error.name).toEqual("PrereleaseStateMismatchError");
      expect(error.channels).toEqual({ "@scope/a": "beta", "@scope/b": undefined });
    });
  });
});
