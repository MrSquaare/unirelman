import { SCOPE_NAMES, SCOPE_PATHS } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NpmError,
  NpmInvalidPackageJsonVersionError,
  NpmPackageJsonNotFoundError,
  NpmPublishAuthError,
  NpmPublishError,
  NpmRegistryLookupError,
  NpmTarballNotFoundError,
  NpmUnresolvedSpecifierError,
  NpmUnsupportedDependencyRangeError,
  NpmUnsupportedPackageManagerError,
} from "./errors";

describe("NpmError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmError("npm failure");

      expect(error.message).toEqual("npm failure");
      expect(error.name).toEqual("NpmError");
    });
  });
});

describe("NpmPackageJsonNotFoundError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const packageJsonPath = `${SCOPE_PATHS[SCOPE_NAMES.ALPHA]}/package.json`;
      const error = new NpmPackageJsonNotFoundError(SCOPE_NAMES.ALPHA, packageJsonPath);

      expect(error.message).toEqual(
        `package.json not found for scope ${SCOPE_NAMES.ALPHA}: ${packageJsonPath}`,
      );
      expect(error.name).toEqual("NpmPackageJsonNotFoundError");
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
      expect(error.filePath).toEqual(packageJsonPath);
    });
  });
});

describe("NpmRegistryLookupError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmRegistryLookupError(SCOPE_NAMES.ALPHA, "1.2.3", "connect ECONNREFUSED");

      expect(error.message).toEqual(
        "Failed to check whether @scope/a@1.2.3 is published: connect ECONNREFUSED",
      );
      expect(error.name).toEqual("NpmRegistryLookupError");
      expect(error.packageName).toEqual(SCOPE_NAMES.ALPHA);
      expect(error.version).toEqual("1.2.3");
      expect(error.summary).toEqual("connect ECONNREFUSED");
    });
  });
});

describe("NpmPublishAuthError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmPublishAuthError("@scope/a@1.2.3", "ENEEDAUTH");

      expect(error.message).toEqual(
        "Failed to publish @scope/a@1.2.3: npm could not authenticate or authorize the publish (ENEEDAUTH)",
      );
      expect(error.name).toEqual("NpmPublishAuthError");
      expect(error.packageSpec).toEqual("@scope/a@1.2.3");
      expect(error.errorCode).toEqual("ENEEDAUTH");
    });
  });
});

describe("NpmPublishError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmPublishError("@scope/a@1.2.3", "cannot publish over 1.2.3");

      expect(error.message).toEqual("Failed to publish @scope/a@1.2.3: cannot publish over 1.2.3");
      expect(error.name).toEqual("NpmPublishError");
      expect(error.packageSpec).toEqual("@scope/a@1.2.3");
      expect(error.summary).toEqual("cannot publish over 1.2.3");
    });
  });
});

describe("NpmInvalidPackageJsonVersionError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmInvalidPackageJsonVersionError(SCOPE_NAMES.ALPHA);

      expect(error.message).toEqual(
        `Missing or invalid version in package.json for scope ${SCOPE_NAMES.ALPHA}`,
      );
      expect(error.name).toEqual("NpmInvalidPackageJsonVersionError");
      expect(error.scopeName).toEqual(SCOPE_NAMES.ALPHA);
    });
  });
});

describe("NpmUnsupportedPackageManagerError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmUnsupportedPackageManagerError("deno@2.0.0", [
        "npm",
        "pnpm",
        "yarn",
        "bun",
      ]);

      expect(error.message).toEqual(
        'Unsupported packageManager "deno@2.0.0" in package.json. Supported package managers: npm, pnpm, yarn, bun',
      );
      expect(error.name).toEqual("NpmUnsupportedPackageManagerError");
      expect(error.packageManagerField).toEqual("deno@2.0.0");
      expect(error.supportedPackageManagers).toEqual(["npm", "pnpm", "yarn", "bun"]);
    });
  });
});

describe("NpmUnresolvedSpecifierError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmUnresolvedSpecifierError("@scope/b", "@scope/a", "workspace:^");

      expect(error.message).toEqual(
        'Failed to publish @scope/b: npm cannot resolve the specifier "workspace:^" of dependency @scope/a',
      );
      expect(error.name).toEqual("NpmUnresolvedSpecifierError");
      expect(error.packageName).toEqual("@scope/b");
      expect(error.dependencyName).toEqual("@scope/a");
      expect(error.specifier).toEqual("workspace:^");
    });
  });
});

describe("NpmUnsupportedDependencyRangeError", () => {
  describe("constructor", () => {
    it("should construct with correct message and name", () => {
      const error = new NpmUnsupportedDependencyRangeError(
        "@scope/b",
        "@scope/a",
        ">=1.0.0 <2.0.0",
        "2.0.0",
      );

      expect(error.message).toEqual(
        'Failed to update dependency @scope/a of scope @scope/b to 2.0.0: only exact, ^ and ~ ranges can be updated, and ">=1.0.0 <2.0.0" excludes 2.0.0',
      );
      expect(error.name).toEqual("NpmUnsupportedDependencyRangeError");
      expect(error.scopeName).toEqual("@scope/b");
      expect(error.dependencyName).toEqual("@scope/a");
      expect(error.specifier).toEqual(">=1.0.0 <2.0.0");
      expect(error.nextVersion).toEqual("2.0.0");
    });
  });
});

describe("NpmTarballNotFoundError", () => {
  describe("constructor", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should construct with correct message and name", () => {
      const error = new NpmTarballNotFoundError("@scope/a", "/tmp/unirelman-npm-abc");

      expect(error.message).toEqual(
        "Failed to publish @scope/a: packing wrote no tarball to /tmp/unirelman-npm-abc",
      );
      expect(error.name).toEqual("NpmTarballNotFoundError");
      expect(error.packageName).toEqual("@scope/a");
      expect(error.directory).toEqual("/tmp/unirelman-npm-abc");
    });
  });
});
