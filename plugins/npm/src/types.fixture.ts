import { SCOPE_NAMES, VERSIONS } from "@unirelman/core/testing/fixtures";
import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { PackageJson, PublishPackageJson } from "./types";

export const createPackageJson = defineObjectGenerator<PackageJson>(() => ({
  name: SCOPE_NAMES.ALPHA,
  version: VERSIONS.DEFAULT,
  private: false,
}));

export const createPublishPackageJson = defineObjectGenerator<PublishPackageJson>(() => ({
  name: SCOPE_NAMES.ALPHA,
  version: VERSIONS.DEFAULT,
  private: false,
}));
