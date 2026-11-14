import {
  mockedReadScopePackageJson,
  mockedResolvePackageJsonVersion,
} from "../helpers/package-json.mock";
import {
  mockedFindUnresolvedSpecifier,
  mockedResolveManifestDirectories,
  mockedResolvePackageManager,
  mockedResolvePublishCommand,
} from "../helpers/package-manager.mock";

import {
  createPhaseContext,
  createCreateReleasesState,
  createScope,
  createScopeMap,
  createVersion,
  SCOPE_NAMES,
  SCOPE_PATHS,
  VERSIONS,
} from "@unirelman/core/testing/fixtures";
import { MockedFS } from "@unirelman/core/testing/mock";
import { mockedExecCommand, mockedParseJSON } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NpmPublishAuthError,
  NpmPublishError,
  NpmRegistryLookupError,
  NpmUnresolvedSpecifierError,
} from "../errors";
import { createResolvedNpmPluginOptions } from "../helpers/options.fixture";
import { packageManagerManifestSchema, publishPackageJsonSchema } from "../types";
import { createPublishPackageJson } from "../types.fixture";
import {
  createCreateReleasesPhase,
  hasNpmVersion,
  publishPackage,
  readScopePackageManager,
  resolveRegistryArgs,
  runNpmPublish,
} from "./create-releases";
import * as thisMod from "./create-releases";

describe("resolveRegistryArgs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass the publish registry of an unscoped package", () => {
    expect(
      resolveRegistryArgs(
        createPublishPackageJson({
          name: "example",
          publishConfig: { registry: "https://registry.example.com/" },
        }),
      ),
    ).toEqual(["--registry=https://registry.example.com/"]);
  });

  it("should pass the scoped and the default publish registries of a scoped package", () => {
    expect(
      resolveRegistryArgs(
        createPublishPackageJson({
          name: "@example/core",
          publishConfig: {
            "@example:registry": "https://scoped.example.com/",
            registry: "https://registry.example.com/",
          },
        }),
      ),
    ).toEqual([
      "--@example:registry=https://scoped.example.com/",
      "--registry=https://registry.example.com/",
    ]);
  });

  it("should ignore the scoped registry key of another scope", () => {
    expect(
      resolveRegistryArgs(
        createPublishPackageJson({
          name: "@example/core",
          publishConfig: { "@other:registry": "https://other.example.com/", access: "public" },
        }),
      ),
    ).toEqual([]);
  });

  it("should pass no registry without publish config", () => {
    expect(resolveRegistryArgs(createPublishPackageJson({ name: "@example/core" }))).toEqual([]);
  });
});

describe("hasNpmVersion", () => {
  const packageDir = SCOPE_PATHS[SCOPE_NAMES.ALPHA];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when npm view finds the version", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: '"1.2.3"\n', stderr: "" });

    await expect(
      hasNpmVersion(SCOPE_NAMES.ALPHA, VERSIONS.DEFAULT, packageDir, []),
    ).resolves.toEqual(true);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["view", "@scope/a@1.2.3", "version", "--json"],
      { cwd: packageDir, allowedExitCodes: [0, 1] },
    );
    expect(mockedParseJSON).not.toHaveBeenCalled();
  });

  it("should look the version up in the given registry", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: '"1.2.3"\n', stderr: "" });

    await expect(
      hasNpmVersion(SCOPE_NAMES.ALPHA, VERSIONS.DEFAULT, packageDir, [
        "--registry=https://registry.example.com/",
      ]),
    ).resolves.toEqual(true);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["view", "@scope/a@1.2.3", "version", "--json", "--registry=https://registry.example.com/"],
      { cwd: packageDir, allowedExitCodes: [0, 1] },
    );
  });

  it("should return false when npm view reports the version as not found", async () => {
    const stdout = '{"error":{"code":"E404","summary":"No match found for version 1.2.3"}}';

    mockedExecCommand.mockResolvedValueOnce({ exitCode: 1, stdout, stderr: "" });

    await expect(
      hasNpmVersion(SCOPE_NAMES.ALPHA, VERSIONS.DEFAULT, packageDir, []),
    ).resolves.toEqual(false);
    expect(mockedParseJSON).toHaveBeenCalledTimes(1);
    expect(mockedParseJSON).toHaveBeenNthCalledWith(
      1,
      "npm view @scope/a@1.2.3",
      stdout,
      mockedParseJSON.mock.calls[0]?.[2],
    );
  });

  it("should throw when npm view fails for another reason", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '{"error":{"code":"ECONNREFUSED","summary":"connect ECONNREFUSED"}}',
      stderr: "",
    });

    await expect(
      hasNpmVersion(SCOPE_NAMES.ALPHA, VERSIONS.DEFAULT, packageDir, []),
    ).rejects.toThrow(
      new NpmRegistryLookupError(SCOPE_NAMES.ALPHA, VERSIONS.DEFAULT, "connect ECONNREFUSED"),
    );
  });
});

describe("readScopePackageManager", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the configured package manager without reading manifests", async () => {
    const fs = new MockedFS("/repo");

    await expect(readScopePackageManager(fs, "/repo", "/repo/web/sdk", "yarn")).resolves.toEqual(
      "yarn",
    );

    expect(fs.readJSON).not.toHaveBeenCalled();
    expect(mockedResolvePackageManager).not.toHaveBeenCalled();
  });

  it("should resolve the package manager from the manifests up to the project root", async () => {
    const fs = new MockedFS("/repo");
    const sdkManifest = { name: "@example/sdk" };
    const webManifest = { packageManager: "pnpm@12.16.1" };
    const rootManifest = {};

    vi.mocked(fs.readJSON)
      .mockResolvedValueOnce(sdkManifest)
      .mockResolvedValueOnce(webManifest)
      .mockResolvedValueOnce(rootManifest);

    await expect(readScopePackageManager(fs, "/repo", "/repo/web/sdk", undefined)).resolves.toEqual(
      "pnpm",
    );

    expect(mockedResolveManifestDirectories).toHaveBeenCalledTimes(1);
    expect(mockedResolveManifestDirectories).toHaveBeenNthCalledWith(1, "/repo", "/repo/web/sdk");
    expect(fs.readJSON).toHaveBeenCalledTimes(3);
    expect(fs.readJSON).toHaveBeenNthCalledWith(
      1,
      "/repo/web/sdk/package.json",
      packageManagerManifestSchema,
      {},
    );
    expect(fs.readJSON).toHaveBeenNthCalledWith(
      2,
      "/repo/web/package.json",
      packageManagerManifestSchema,
      {},
    );
    expect(fs.readJSON).toHaveBeenNthCalledWith(
      3,
      "/repo/package.json",
      packageManagerManifestSchema,
      {},
    );
    expect(mockedResolvePackageManager).toHaveBeenCalledTimes(1);
    expect(mockedResolvePackageManager).toHaveBeenNthCalledWith(1, [
      sdkManifest,
      webManifest,
      rootManifest,
    ]);
  });
});

describe("runNpmPublish", () => {
  const packageDir = SCOPE_PATHS[SCOPE_NAMES.ALPHA];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish with npm in the package directory", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: "{}", stderr: "" });

    await expect(
      runNpmPublish("@scope/a@1.2.3", packageDir, ["publish", "--json", "--tag", "alpha"]),
    ).resolves.toEqual(undefined);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["publish", "--json", "--tag", "alpha"],
      { cwd: packageDir, allowedExitCodes: [0, 1] },
    );
    expect(mockedParseJSON).not.toHaveBeenCalled();
  });

  it.each(["ENEEDAUTH", "E401", "E403", "EOTP"])(
    "should throw an authentication error when npm publish fails with %s",
    async (code) => {
      const stdout = `{"error":{"code":"${code}","summary":"authentication failed"}}`;

      mockedExecCommand.mockResolvedValueOnce({ exitCode: 1, stdout, stderr: "" });

      await expect(
        runNpmPublish("@scope/a@1.2.3", packageDir, ["publish", "--json"]),
      ).rejects.toThrow(new NpmPublishAuthError("@scope/a@1.2.3", code));
      expect(mockedParseJSON).toHaveBeenCalledTimes(1);
      expect(mockedParseJSON).toHaveBeenNthCalledWith(
        1,
        "npm publish @scope/a@1.2.3",
        stdout,
        mockedParseJSON.mock.calls[0]?.[2],
      );
    },
  );

  it("should throw a publish error when npm publish fails for another reason", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '{"error":{"code":"EPUBLISHCONFLICT","summary":"cannot publish over 1.2.3"}}',
      stderr: "",
    });

    await expect(
      runNpmPublish("@scope/a@1.2.3", packageDir, ["publish", "--json"]),
    ).rejects.toThrow(new NpmPublishError("@scope/a@1.2.3", "cannot publish over 1.2.3"));
  });

  it("should throw a publish error when npm reports an error without code", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '{"error":{"summary":"Invalid version: \\"2026.01.01.0\\""}}',
      stderr: "",
    });

    await expect(
      runNpmPublish("@scope/a@2026.01.01.0", packageDir, ["publish", "--json"]),
    ).rejects.toThrow(
      new NpmPublishError("@scope/a@2026.01.01.0", 'Invalid version: "2026.01.01.0"'),
    );
  });
});

describe("publishPackage", () => {
  const packageDir = SCOPE_PATHS[SCOPE_NAMES.ALPHA];
  const runNpmPublishSpy = vi.spyOn(thisMod, "runNpmPublish");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish an npm package with npm and its error handling", async () => {
    const prerelease = { channel: "alpha", increment: 0 };

    runNpmPublishSpy.mockResolvedValueOnce(undefined);

    await expect(
      publishPackage("npm", packageDir, "@scope/a@1.3.0-alpha.0", prerelease),
    ).resolves.toEqual(undefined);

    expect(mockedResolvePublishCommand).toHaveBeenCalledTimes(1);
    expect(mockedResolvePublishCommand).toHaveBeenNthCalledWith(1, "npm", prerelease);
    expect(runNpmPublishSpy).toHaveBeenCalledTimes(1);
    expect(runNpmPublishSpy).toHaveBeenNthCalledWith(1, "@scope/a@1.3.0-alpha.0", packageDir, [
      "publish",
      "--json",
      "--tag",
      "alpha",
    ]);
    expect(mockedExecCommand).not.toHaveBeenCalled();
  });

  it("should publish with the native publish command of another package manager", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

    await expect(publishPackage("pnpm", packageDir, "@scope/a@1.2.3", undefined)).resolves.toEqual(
      undefined,
    );

    expect(mockedResolvePublishCommand).toHaveBeenCalledTimes(1);
    expect(mockedResolvePublishCommand).toHaveBeenNthCalledWith(1, "pnpm", undefined);
    expect(runNpmPublishSpy).not.toHaveBeenCalled();
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "pnpm", ["publish", "--no-git-checks"], {
      cwd: packageDir,
    });
  });
});

describe("createCreateReleasesPhase", () => {
  const readScopePackageManagerSpy = vi.spyOn(thisMod, "readScopePackageManager");
  const resolveRegistryArgsSpy = vi.spyOn(thisMod, "resolveRegistryArgs");
  const hasNpmVersionSpy = vi.spyOn(thisMod, "hasNpmVersion");
  const publishPackageSpy = vi.spyOn(thisMod, "publishPackage");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should publish package versions that are not on the registry", async () => {
    const context = createPhaseContext();
    const packageJsonA = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
    });
    const packageJsonB = createPublishPackageJson({
      name: SCOPE_NAMES.BETA,
      version: VERSIONS.MAJOR,
    });

    readScopePackageManagerSpy.mockResolvedValueOnce("pnpm").mockResolvedValueOnce("pnpm");
    mockedReadScopePackageJson
      .mockResolvedValueOnce(packageJsonA)
      .mockResolvedValueOnce(packageJsonB);
    hasNpmVersionSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    publishPackageSpy.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
    );

    await expect(phase(context, createCreateReleasesState())).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "npm-package", name: "@scope/a@1.2.3", status: "created", meta: {} },
      ],
      [SCOPE_NAMES.BETA]: [
        { type: "npm-package", name: "@scope/b@2.0.0", status: "created", meta: {} },
      ],
    });
    expect(mockedReadScopePackageJson).toHaveBeenCalledTimes(2);
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      1,
      context.fs,
      SCOPE_NAMES.ALPHA,
      `${SCOPE_PATHS[SCOPE_NAMES.ALPHA]}/package.json`,
      publishPackageJsonSchema,
    );
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      2,
      context.fs,
      SCOPE_NAMES.BETA,
      `${SCOPE_PATHS[SCOPE_NAMES.BETA]}/package.json`,
      publishPackageJsonSchema,
    );
    expect(mockedResolvePackageJsonVersion).toHaveBeenCalledTimes(2);
    expect(mockedResolvePackageJsonVersion).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      packageJsonA,
    );
    expect(mockedResolvePackageJsonVersion).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      packageJsonB,
    );
    expect(resolveRegistryArgsSpy).toHaveBeenCalledTimes(2);
    expect(resolveRegistryArgsSpy).toHaveBeenNthCalledWith(1, packageJsonA);
    expect(resolveRegistryArgsSpy).toHaveBeenNthCalledWith(2, packageJsonB);
    expect(hasNpmVersionSpy).toHaveBeenCalledTimes(2);
    expect(hasNpmVersionSpy).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      VERSIONS.DEFAULT,
      SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      [],
    );
    expect(hasNpmVersionSpy).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      VERSIONS.MAJOR,
      SCOPE_PATHS[SCOPE_NAMES.BETA],
      [],
    );
    expect(readScopePackageManagerSpy).toHaveBeenCalledTimes(2);
    expect(readScopePackageManagerSpy).toHaveBeenNthCalledWith(
      1,
      context.fs,
      context.cwd,
      SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      undefined,
    );
    expect(readScopePackageManagerSpy).toHaveBeenNthCalledWith(
      2,
      context.fs,
      context.cwd,
      SCOPE_PATHS[SCOPE_NAMES.BETA],
      undefined,
    );
    expect(publishPackageSpy).toHaveBeenCalledTimes(2);
    expect(publishPackageSpy).toHaveBeenNthCalledWith(
      1,
      "pnpm",
      SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      "@scope/a@1.2.3",
      undefined,
    );
    expect(publishPackageSpy).toHaveBeenNthCalledWith(
      2,
      "pnpm",
      SCOPE_PATHS[SCOPE_NAMES.BETA],
      "@scope/b@2.0.0",
      undefined,
    );
    expect(context.logger.info).toHaveBeenCalledTimes(2);
    expect(context.logger.info).toHaveBeenNthCalledWith(1, "Published @scope/a@1.2.3");
    expect(context.logger.info).toHaveBeenNthCalledWith(2, "Published @scope/b@2.0.0");
  });

  it("should publish prerelease versions with their prerelease tag", async () => {
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const packageJson = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: "1.3.0-alpha.0",
    });
    const state = createCreateReleasesState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({
          extends: {
            version: "1.3.0-alpha.0",
            meta: { prerelease: { channel: "alpha", increment: 0 } },
          },
        }),
      },
    });

    readScopePackageManagerSpy.mockResolvedValueOnce("npm");
    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);
    hasNpmVersionSpy.mockResolvedValueOnce(false);
    publishPackageSpy.mockResolvedValueOnce(undefined);

    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
    );

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "npm-package", name: "@scope/a@1.3.0-alpha.0", status: "created", meta: {} },
      ],
    });
    expect(publishPackageSpy).toHaveBeenCalledTimes(1);
    expect(publishPackageSpy).toHaveBeenNthCalledWith(
      1,
      "npm",
      SCOPE_PATHS[SCOPE_NAMES.ALPHA],
      "@scope/a@1.3.0-alpha.0",
      { channel: "alpha", increment: 0 },
    );
  });

  it("should skip every scope when publish is disabled", async () => {
    const context = createPhaseContext();
    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: false, packageManager: undefined } }),
    );

    await expect(phase(context, createCreateReleasesState())).resolves.toEqual({});
    expect(readScopePackageManagerSpy).not.toHaveBeenCalled();
    expect(mockedReadScopePackageJson).not.toHaveBeenCalled();
    expect(hasNpmVersionSpy).not.toHaveBeenCalled();
    expect(publishPackageSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping npm publish: publish disabled",
    );
  });

  it("should skip private packages", async () => {
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScope() },
    });
    const packageJson = createPublishPackageJson({ version: VERSIONS.DEFAULT, private: true });

    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);

    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
    );

    await expect(phase(context, createCreateReleasesState())).resolves.toEqual({});
    expect(hasNpmVersionSpy).not.toHaveBeenCalled();
    expect(readScopePackageManagerSpy).not.toHaveBeenCalled();
    expect(publishPackageSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping npm publish for @scope/a: package is private",
    );
  });

  it("should skip package versions already on the registry", async () => {
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScope() },
    });
    const packageJson = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
    });

    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);
    hasNpmVersionSpy.mockResolvedValueOnce(true);

    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
    );

    await expect(phase(context, createCreateReleasesState())).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "npm-package", name: "@scope/a@1.2.3", status: "existing", meta: {} },
      ],
    });
    expect(readScopePackageManagerSpy).not.toHaveBeenCalled();
    expect(publishPackageSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping npm publish for @scope/a: @scope/a@1.2.3 already published",
    );
  });

  it("should not publish in dry-run mode", async () => {
    const context = createPhaseContext({
      dryRun: true,
      scopes: { [SCOPE_NAMES.ALPHA]: createScope() },
    });
    const packageJson = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
    });

    readScopePackageManagerSpy.mockResolvedValueOnce("npm");
    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);
    hasNpmVersionSpy.mockResolvedValueOnce(false);

    const phase = createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
    );

    await expect(phase(context, createCreateReleasesState())).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        { type: "npm-package", name: "@scope/a@1.2.3", status: "created", meta: {} },
      ],
    });
    expect(publishPackageSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(1, "Would publish @scope/a@1.2.3");
  });

  it("should resolve the package manager of the scope with the plugin option", async () => {
    const context = createPhaseContext({ scopes: { [SCOPE_NAMES.ALPHA]: createScope() } });

    readScopePackageManagerSpy.mockResolvedValueOnce("bun");
    mockedReadScopePackageJson.mockResolvedValueOnce(
      createPublishPackageJson({ name: SCOPE_NAMES.ALPHA, version: VERSIONS.DEFAULT }),
    );
    hasNpmVersionSpy.mockResolvedValueOnce(false);
    publishPackageSpy.mockResolvedValueOnce(undefined);

    await createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: "bun" } }),
    )(context, createCreateReleasesState());

    expect(readScopePackageManagerSpy).toHaveBeenCalledTimes(1);
    expect(readScopePackageManagerSpy).toHaveBeenNthCalledWith(
      1,
      context.fs,
      context.cwd,
      context.scopes[SCOPE_NAMES.ALPHA]?.path,
      "bun",
    );
  });

  it("should not check specifiers when another package manager packs the package", async () => {
    const context = createPhaseContext({ scopes: { [SCOPE_NAMES.ALPHA]: createScope() } });
    const packageJson = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
      dependencies: { "@scope/b": "workspace:^" },
    });

    readScopePackageManagerSpy.mockResolvedValueOnce("pnpm");
    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);
    hasNpmVersionSpy.mockResolvedValueOnce(false);
    publishPackageSpy.mockResolvedValueOnce(undefined);

    await createCreateReleasesPhase(
      createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: "pnpm" } }),
    )(context, createCreateReleasesState());

    expect(mockedFindUnresolvedSpecifier).not.toHaveBeenCalled();
    expect(publishPackageSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw when npm would publish a specifier it cannot resolve", async () => {
    const context = createPhaseContext({
      dryRun: true,
      scopes: { [SCOPE_NAMES.ALPHA]: createScope() },
    });
    const packageJson = createPublishPackageJson({
      name: SCOPE_NAMES.ALPHA,
      version: VERSIONS.DEFAULT,
      dependencies: { "@scope/b": "workspace:^" },
    });

    readScopePackageManagerSpy.mockResolvedValueOnce("npm");
    mockedReadScopePackageJson.mockResolvedValueOnce(packageJson);
    hasNpmVersionSpy.mockResolvedValueOnce(false);

    await expect(
      createCreateReleasesPhase(
        createResolvedNpmPluginOptions({ extends: { publish: true, packageManager: undefined } }),
      )(context, createCreateReleasesState()),
    ).rejects.toThrow(new NpmUnresolvedSpecifierError("@scope/a", "@scope/b", "workspace:^"));

    expect(mockedFindUnresolvedSpecifier).toHaveBeenCalledTimes(1);
    expect(mockedFindUnresolvedSpecifier).toHaveBeenNthCalledWith(1, packageJson);
    expect(publishPackageSpy).not.toHaveBeenCalled();
    expect(context.logger.info).not.toHaveBeenCalled();
  });
});
