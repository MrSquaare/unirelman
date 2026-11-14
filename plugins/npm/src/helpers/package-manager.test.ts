import { mockedExecCommand } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NpmUnsupportedPackageManagerError } from "../errors";
import { createPublishPackageJson } from "../types.fixture";
import * as thisMod from "./package-manager";
import {
  findUnresolvedSpecifier,
  isNpmPackageManager,
  parsePackageManagerField,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePackCommand,
  runPackageScript,
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

  it("should throw when the package manager is not supported", () => {
    expect(() => parsePackageManagerField("deno@2.0.0")).toThrow(
      new NpmUnsupportedPackageManagerError("deno@2.0.0", ["npm", "pnpm", "yarn", "bun"]),
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

describe("resolvePackCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pack with npm into the destination", () => {
    expect(resolvePackCommand("npm", "/tmp/pack")).toEqual({
      command: "npm",
      args: ["pack", "--pack-destination", "/tmp/pack"],
    });
  });

  it("should pack with pnpm into the destination", () => {
    expect(resolvePackCommand("pnpm", "/tmp/pack")).toEqual({
      command: "pnpm",
      args: ["pack", "--pack-destination", "/tmp/pack"],
    });
  });

  it("should pack with yarn into a tarball of the destination", () => {
    expect(resolvePackCommand("yarn", "/tmp/pack")).toEqual({
      command: "yarn",
      args: ["pack", "--out", "/tmp/pack/package.tgz"],
    });
  });

  it("should pack with bun into the destination", () => {
    expect(resolvePackCommand("bun", "/tmp/pack")).toEqual({
      command: "bun",
      args: ["pm", "pack", "--destination", "/tmp/pack"],
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

describe("runPackageScript", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run a declared script with the package manager", async () => {
    const packageJson = createPublishPackageJson({
      extends: { scripts: { prepublishOnly: "tsdown" } },
    });

    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

    await expect(
      runPackageScript("pnpm", "/repo/packages/a", packageJson, "prepublishOnly"),
    ).resolves.toEqual(undefined);

    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "pnpm", ["run", "prepublishOnly"], {
      cwd: "/repo/packages/a",
    });
  });

  it("should run nothing when the script is not declared", async () => {
    const packageJson = createPublishPackageJson({ extends: { scripts: { build: "tsdown" } } });

    await expect(
      runPackageScript("pnpm", "/repo/packages/a", packageJson, "prepublishOnly"),
    ).resolves.toEqual(undefined);

    expect(mockedExecCommand).not.toHaveBeenCalled();
  });
});
