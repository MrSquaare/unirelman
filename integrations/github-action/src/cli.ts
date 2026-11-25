import type * as z from "zod";

import { getExecOutput } from "@actions/exec";
import {
  publishOutputSchema,
  versionOutputSchema,
  type ParsedPublishOutput,
  type ParsedVersionOutput,
} from "@unirelman/cli/output";
import { parseJSON } from "@unirelman/utils";

import type { Environment } from "./types";

import * as thisMod from "./cli";
import { resolveCommandEnvironment } from "./env";

export const resolveUnirelmanEnvironment = (
  environment: Environment,
  githubToken: string,
): Record<string, string> => {
  return resolveCommandEnvironment(environment, { GITHUB_TOKEN: githubToken });
};

export const runUnirelman = async <TSchema extends z.ZodType>(
  command: string,
  args: string[],
  schema: TSchema,
  cwd: string,
  environment: Record<string, string>,
): Promise<z.output<TSchema>> => {
  const { stdout } = await getExecOutput(command, args, { cwd, env: environment });

  return parseJSON(`${command} ${args.join(" ")}`, stdout, schema);
};

export const runUnirelmanPublish = async (
  command: string,
  cwd: string,
  environment: Record<string, string>,
): Promise<ParsedPublishOutput> => {
  return thisMod.runUnirelman(
    command,
    ["publish", "--json"],
    publishOutputSchema,
    cwd,
    environment,
  );
};

export const runUnirelmanVersion = async (
  command: string,
  cwd: string,
  environment: Record<string, string>,
): Promise<ParsedVersionOutput> => {
  return thisMod.runUnirelman(
    command,
    ["version", "--json"],
    versionOutputSchema,
    cwd,
    environment,
  );
};
