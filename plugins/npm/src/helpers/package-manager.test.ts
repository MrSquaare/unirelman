import { afterEach, describe, expect, it, vi } from "vitest";

import { NpmUnsupportedPackageManagerError, NpmUnsupportedYarnClassicError } from "../errors";
import { createPublishPackageJson } from "../types.fixture";
import * as thisMod from "./package-manager";
import {
  findUnresolvedSpecifier,
  isNpmPackageManager,
  parsePackageManagerField,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePublishCommand,
} from "./package-manager";

describe("isNpmPackageManager", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for a supported package manager", () => {
    expect(isNpmPackageManager("pnpm")).toEqual(true);
  });

  it("should return false for an unsupported package manager", () => {
    expect(isNpmPackageManager("deno")).toEqual(false);
  });
});

describe("parsePackageManagerField", () => {
  const isNpmPackageManagerSpy = vi.spyOn(thisMod, "isNpmPackageManager");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the package manager of a versioned field", () => {
    expect(parsePackageManagerField("pnpm@12.16.1")).toEqual("pnpm");

    expect(isNpmPackageManagerSpy).toHaveBeenCalledTimes(1);
    expect(isNpmPackageManagerSpy).toHaveBeenNthCalledWith(1, "pnpm");
  });

  it("should return the package manager of a field without version", () => {
    expect(parsePackageManagerField(" yarn ")).toEqual("yarn");
  });

  it("should return yarn for Yarn 2 or later", () => {
    expect(parsePackageManagerField("yarn@4.9.2")).toEqual("yarn");
  });

  it("should throw when the package manager is not supported", () => {
    expect(() => parsePackageManagerField("deno@2.0.0")).toThrow(
      new NpmUnsupportedPackageManagerError("deno@2.0.0", ["npm", "pnpm", "yarn", "bun"]),
    );
  });

  it("should throw when the field names Yarn Classic", () => {
    expect(() => parsePackageManagerField("yarn@1.22.22")).toThrow(
      new NpmUnsupportedYarnClassicError("yarn@1.22.22"),
    );
  });
});

describe("resolveManifestDirectories", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the directories from the scope up to the project root", () => {
    expect(resolveManifestDirectories("/repo", "/repo/web/packages/sdk")).toEqual([
      "/repo/web/packages/sdk",
      "/repo/web/packages",
      "/repo/web",
      "/repo",
    ]);
  });

  it("should return only the project root for a root scope", () => {
    expect(resolveManifestDirectories("/repo", "/repo")).toEqual(["/repo"]);
  });
});

describe("resolvePackageManager", () => {
  const parsePackageManagerFieldSpy = vi.spyOn(thisMod, "parsePackageManagerField");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the package manager of the closest manifest declaring it", () => {
    expect(
      resolvePackageManager([
        { name: "@example/sdk" },
        { packageManager: "pnpm@12.16.1" },
        { packageManager: "bun@1.3.0" },
      ]),
    ).toEqual("pnpm");

    expect(parsePackageManagerFieldSpy).toHaveBeenCalledTimes(1);
    expect(parsePackageManagerFieldSpy).toHaveBeenNthCalledWith(1, "pnpm@12.16.1");
  });

  it("should return npm when no manifest declares a package manager", () => {
    expect(resolvePackageManager([{ name: "@example/sdk" }, {}])).toEqual("npm");

    expect(parsePackageManagerFieldSpy).not.toHaveBeenCalled();
  });
});

describe("resolvePublishCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish with npm and JSON output", () => {
    expect(resolvePublishCommand("npm", undefined)).toEqual({
      command: "npm",
      args: ["publish", "--json"],
    });
  });

  it("should publish with pnpm without its git checks", () => {
    expect(resolvePublishCommand("pnpm", undefined)).toEqual({
      command: "pnpm",
      args: ["publish", "--no-git-checks"],
    });
  });

  it("should publish with yarn npm publish", () => {
    expect(resolvePublishCommand("yarn", undefined)).toEqual({
      command: "yarn",
      args: ["npm", "publish"],
    });
  });

  it("should publish with bun", () => {
    expect(resolvePublishCommand("bun", undefined)).toEqual({
      command: "bun",
      args: ["publish"],
    });
  });

  it("should publish a prerelease under its channel tag", () => {
    expect(resolvePublishCommand("pnpm", { channel: "alpha", increment: 0 })).toEqual({
      command: "pnpm",
      args: ["publish", "--no-git-checks", "--tag", "alpha"],
    });
  });
});

describe("findUnresolvedSpecifier", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a workspace dependency", () => {
    const packageJson = createPublishPackageJson({
      extends: { dependencies: { "@scope/a": "workspace:^", react: "^19.0.0" } },
    });

    expect(findUnresolvedSpecifier(packageJson)).toEqual({
      dependencyName: "@scope/a",
      specifier: "workspace:^",
    });
  });

  it("should return a catalog peer dependency", () => {
    const packageJson = createPublishPackageJson({
      extends: { peerDependencies: { react: "catalog:react19" } },
    });

    expect(findUnresolvedSpecifier(packageJson)).toEqual({
      dependencyName: "react",
      specifier: "catalog:react19",
    });
  });

  it("should return a workspace optional dependency", () => {
    const packageJson = createPublishPackageJson({
      extends: { optionalDependencies: { "@scope/a": "workspace:*" } },
    });

    expect(findUnresolvedSpecifier(packageJson)).toEqual({
      dependencyName: "@scope/a",
      specifier: "workspace:*",
    });
  });

  it("should return undefined when every specifier is a version range", () => {
    const packageJson = createPublishPackageJson({
      extends: { dependencies: { react: "^19.0.0" } },
    });

    expect(findUnresolvedSpecifier(packageJson)).toEqual(undefined);
  });

  it("should return undefined when the package has no dependencies", () => {
    expect(findUnresolvedSpecifier(createPublishPackageJson())).toEqual(undefined);
  });
});
