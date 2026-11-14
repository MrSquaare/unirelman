import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CoreConflictingFileOperationError,
  CoreDuplicatePluginRegistrationError,
  CoreEmptyFileOperationPathError,
  CoreDuplicateScopeNameError,
  CoreDuplicateScopePathError,
  CoreEmptyConfigPluginScopeNameError,
  CoreEmptyConfigPluginScopesError,
  CoreEmptyScopeNameError,
  CoreReservedScopeNameError,
  CoreEmptyScopesError,
  CoreError,
  CoreFileNotFoundError,
  CoreInvalidConfigError,
  CoreMissingPhaseProviderError,
  CoreConflictingPhaseProvidersError,
  CoreUnstableNextVersionError,
  CorePhaseError,
  CoreScopePathOutsideCwdError,
  CoreUnknownConfigPluginScopeError,
  CoreUnknownPhaseResultScopeError,
  CoreTeardownError,
} from "./errors";
import { PLUGIN_NAMES, SCOPE_NAMES, SCOPE_PATHS } from "./testing/fixtures/constants";

describe("CoreError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreError with name and message", () => {
      const error = new CoreError("base message");

      expect(error.name).toEqual("CoreError");
      expect(error.message).toEqual("base message");
    });

    it("should initialize CoreError with cause when options are provided", () => {
      const cause = new Error("cause");
      const error = new CoreError("base message", { cause });

      expect(error.cause).toEqual(cause);
    });
  });
});

describe("CoreEmptyScopesError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreEmptyScopesError with expected name and message", () => {
      const error = new CoreEmptyScopesError();

      expect(error.name).toEqual("CoreEmptyScopesError");
      expect(error.message).toEqual("At least one scope is required");
    });
  });
});

describe("CoreEmptyScopeNameError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreEmptyScopeNameError with expected name and message", () => {
      const error = new CoreEmptyScopeNameError();

      expect(error.name).toEqual("CoreEmptyScopeNameError");
      expect(error.message).toEqual("Scope name cannot be empty");
    });
  });
});

describe("CoreReservedScopeNameError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreReservedScopeNameError with name, scopeName property, and message", () => {
      const error = new CoreReservedScopeNameError("constructor");

      expect(error.name).toEqual("CoreReservedScopeNameError");
      expect(error.scopeName).toEqual("constructor");
      expect(error.message).toEqual(
        'Scope name "constructor" is reserved: it is a property of Object.prototype',
      );
    });
  });
});

describe("CoreDuplicateScopeNameError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreDuplicateScopeNameError with name, scopeName property, and message", () => {
      const scopeName = SCOPE_NAMES.ALPHA;
      const error = new CoreDuplicateScopeNameError(scopeName);

      expect(error.name).toEqual("CoreDuplicateScopeNameError");
      expect(error.scopeName).toEqual(scopeName);
      expect(error.message).toEqual(`Scope name "${scopeName}" is duplicated`);
    });
  });
});

describe("CoreScopePathOutsideCwdError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreScopePathOutsideCwdError with name, scopePath property, and message", () => {
      const scopePath = "/outside";
      const error = new CoreScopePathOutsideCwdError(scopePath);

      expect(error.name).toEqual("CoreScopePathOutsideCwdError");
      expect(error.scopePath).toEqual(scopePath);
      expect(error.message).toEqual(
        `Scope path "${scopePath}" is outside of the current working directory`,
      );
    });
  });
});

describe("CoreDuplicateScopePathError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreDuplicateScopePathError with name, scopePath property, and message", () => {
      const scopePath = SCOPE_PATHS[SCOPE_NAMES.ALPHA];
      const error = new CoreDuplicateScopePathError(scopePath);

      expect(error.name).toEqual("CoreDuplicateScopePathError");
      expect(error.scopePath).toEqual(scopePath);
      expect(error.message).toEqual(`Scope path "${scopePath}" is duplicated`);
    });
  });
});

describe("CoreInvalidConfigError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreInvalidConfigError with details", () => {
      const error = new CoreInvalidConfigError("✖ Invalid input\n  → at plugins[0]");

      expect(error.name).toEqual("CoreInvalidConfigError");
      expect(error.message).toEqual("Invalid config\n✖ Invalid input\n  → at plugins[0]");
      expect(error.details).toEqual("✖ Invalid input\n  → at plugins[0]");
    });
  });
});

describe("CoreEmptyConfigPluginScopesError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreEmptyConfigPluginScopesError with name, pluginName property, and message", () => {
      const pluginName = PLUGIN_NAMES.A;
      const error = new CoreEmptyConfigPluginScopesError(pluginName);

      expect(error.name).toEqual("CoreEmptyConfigPluginScopesError");
      expect(error.pluginName).toEqual(pluginName);
      expect(error.message).toEqual(`Plugin "${pluginName}" config scopes must not be empty`);
    });
  });
});

describe("CoreEmptyConfigPluginScopeNameError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreEmptyConfigPluginScopeNameError with name, pluginName property, and message", () => {
      const pluginName = PLUGIN_NAMES.A;
      const error = new CoreEmptyConfigPluginScopeNameError(pluginName);

      expect(error.name).toEqual("CoreEmptyConfigPluginScopeNameError");
      expect(error.pluginName).toEqual(pluginName);
      expect(error.message).toEqual(`Plugin "${pluginName}" config has an empty scope name`);
    });
  });
});

describe("CoreUnknownConfigPluginScopeError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreUnknownConfigPluginScopeError with name, properties, and message", () => {
      const pluginName = PLUGIN_NAMES.A;
      const scopeName = SCOPE_NAMES.MISSING;
      const error = new CoreUnknownConfigPluginScopeError(pluginName, scopeName, [
        SCOPE_NAMES.ALPHA,
        SCOPE_NAMES.BETA,
      ]);

      expect(error.name).toEqual("CoreUnknownConfigPluginScopeError");
      expect(error.pluginName).toEqual(pluginName);
      expect(error.scopeName).toEqual(scopeName);
      expect(error.knownScopeNames).toEqual([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]);
      expect(error.message).toEqual(
        `Unknown scope "${scopeName}" in plugin "${pluginName}" config. Known scopes: ${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA}`,
      );
    });
  });
});

describe("CoreDuplicatePluginRegistrationError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreDuplicatePluginRegistrationError with plugin name", () => {
      const error = new CoreDuplicatePluginRegistrationError(PLUGIN_NAMES.A);

      expect(error.name).toEqual("CoreDuplicatePluginRegistrationError");
      expect(error.message).toEqual('Plugin "plugin-a" is registered more than once');
      expect(error.pluginName).toEqual(PLUGIN_NAMES.A);
    });
  });
});

describe("CoreMissingPhaseProviderError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreMissingPhaseProviderError with phase name and scope name", () => {
      const error = new CoreMissingPhaseProviderError("computeNextVersion", SCOPE_NAMES.ALPHA);

      expect(error.name).toEqual("CoreMissingPhaseProviderError");
      expect(error.message).toEqual(
        'Scope "@scope/a" has changes but no plugin provides the computeNextVersion phase for it',
      );
      expect(error.phaseName).toEqual("computeNextVersion");
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
    });
  });
});

describe("CoreConflictingPhaseProvidersError", () => {
  describe("constructor", () => {
    it("should initialize CoreConflictingPhaseProvidersError with phase name, scope name and plugin names", () => {
      const error = new CoreConflictingPhaseProvidersError(
        "computeNextVersion",
        SCOPE_NAMES.ALPHA,
        ["plugin-a", "plugin-b"],
      );

      expect(error.name).toEqual("CoreConflictingPhaseProvidersError");
      expect(error.message).toEqual(
        'Scope "@scope/a" has several plugins providing the computeNextVersion phase: plugin-a, plugin-b',
      );
      expect(error.phaseName).toEqual("computeNextVersion");
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
      expect(error.pluginNames).toEqual(["plugin-a", "plugin-b"]);
    });
  });
});

describe("CoreUnstableNextVersionError", () => {
  describe("constructor", () => {
    it("should initialize CoreUnstableNextVersionError with scope name and previous version", () => {
      const error = new CoreUnstableNextVersionError(SCOPE_NAMES.ALPHA, "1.0.1");

      expect(error.name).toEqual("CoreUnstableNextVersionError");
      expect(error.message).toEqual(
        'Dependency changes moved the next version of scope "@scope/a" away from 1.0.1',
      );
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
      expect(error.previousVersion).toEqual("1.0.1");
    });
  });
});

describe("CoreEmptyFileOperationPathError", () => {
  describe("constructor", () => {
    it("should initialize CoreEmptyFileOperationPathError with name, properties, and message", () => {
      const error = new CoreEmptyFileOperationPathError(SCOPE_NAMES.ALPHA, "changelog");

      expect(error.name).toEqual("CoreEmptyFileOperationPathError");
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
      expect(error.fileType).toEqual("changelog");
      expect(error.message).toEqual(
        'File operation "changelog" for scope "@scope/a" has an empty path',
      );
    });
  });
});

describe("CoreConflictingFileOperationError", () => {
  describe("constructor", () => {
    it("should initialize CoreConflictingFileOperationError with name, path, and message", () => {
      const error = new CoreConflictingFileOperationError("/repo/CHANGELOG.md");

      expect(error.name).toEqual("CoreConflictingFileOperationError");
      expect(error.path).toEqual("/repo/CHANGELOG.md");
      expect(error.message).toEqual(
        'File operations for "/repo/CHANGELOG.md" have different actions or contents',
      );
    });
  });
});

describe("CoreFileNotFoundError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize CoreFileNotFoundError with name, properties, message, and cause", () => {
      const cause = new Error("ENOENT");
      const error = new CoreFileNotFoundError("/path/to/file.txt", { cause });

      expect(error.name).toEqual("CoreFileNotFoundError");
      expect(error.filePath).toEqual("/path/to/file.txt");
      expect(error.message).toEqual("File not found: /path/to/file.txt");
      expect(error.cause).toEqual(cause);
    });
  });
});

describe("CorePhaseError", () => {
  describe("constructor", () => {
    it("should initialize CorePhaseError with the phase, the plugin and the original error as cause", () => {
      const cause = new Error("npm could not authenticate");
      const error = new CorePhaseError("createReleases", "npm", cause);

      expect(error.name).toEqual("CorePhaseError");
      expect(error.phaseName).toEqual("createReleases");
      expect(error.pluginName).toEqual("npm");
      expect(error.message).toEqual(
        'Plugin "npm" failed in the createReleases phase: npm could not authenticate',
      );
      expect(error.cause).toEqual(cause);
    });

    it("should describe a thrown value that is not an error", () => {
      const error = new CorePhaseError("createReleases", "npm", "unexpected value");

      expect(error.message).toEqual(
        'Plugin "npm" failed in the createReleases phase: unexpected value',
      );
      expect(error.cause).toEqual("unexpected value");
    });
  });
});

describe("CoreUnknownPhaseResultScopeError", () => {
  describe("constructor", () => {
    it("should initialize CoreUnknownPhaseResultScopeError with the phase, the plugin and the scope", () => {
      const error = new CoreUnknownPhaseResultScopeError("getChanges", "changesets", "gamma");

      expect(error.name).toEqual("CoreUnknownPhaseResultScopeError");
      expect(error.phaseName).toEqual("getChanges");
      expect(error.pluginName).toEqual("changesets");
      expect(error.scopeName).toEqual("gamma");
      expect(error.message).toEqual(
        'Plugin "changesets" returned a getChanges result for scope "gamma", which is not one of its scopes',
      );
    });
  });
});

describe("CoreTeardownError", () => {
  describe("constructor", () => {
    it("should initialize CoreTeardownError with every phase error", () => {
      const errors = [
        new CorePhaseError("teardown", "git", new Error("git failed")),
        new CorePhaseError("teardown", "npm", new Error("npm failed")),
      ];
      const error = new CoreTeardownError(errors);

      expect(error.name).toEqual("CoreTeardownError");
      expect(error.errors).toEqual(errors);
      expect(error.message).toEqual(
        'Several plugins failed in the teardown phase:\nPlugin "git" failed in the teardown phase: git failed\nPlugin "npm" failed in the teardown phase: npm failed',
      );
    });
  });
});
