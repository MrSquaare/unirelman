import { isErrnoException, parseJSON } from "@unirelman/utils";
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as z from "zod";

import { CoreFileNotFoundError } from "../errors";

export type FSReadResult = {
  readonly path: string;
  readonly content: string;
};

export class FS {
  private readonly dirPath: string;

  constructor(cwd: string, subDir = "") {
    this.dirPath = resolve(cwd, subDir);
  }

  async list(): Promise<string[]> {
    try {
      const dirEntries = await readdir(this.dirPath, { withFileTypes: true });

      return dirEntries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  resolvePath(filePath: string): string {
    return resolve(this.dirPath, filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(this.resolvePath(filePath));

      return true;
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return false;
      }

      throw error;
    }
  }

  async read(filePath: string, fallback?: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);

    try {
      return await readFile(fullPath, "utf-8");
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") {
        throw error;
      }

      if (fallback !== undefined) {
        return fallback;
      }

      throw new CoreFileNotFoundError(fullPath, { cause: error });
    }
  }

  async readJSON<TSchema extends z.ZodType>(
    filePath: string,
    schema: TSchema,
    fallback?: z.output<TSchema>,
  ): Promise<z.output<TSchema>> {
    try {
      const content = await this.read(filePath);

      return parseJSON(this.resolvePath(filePath), content, schema);
    } catch (error) {
      if (fallback !== undefined && error instanceof CoreFileNotFoundError) {
        return fallback;
      }

      throw error;
    }
  }

  async readAll(): Promise<FSReadResult[]> {
    const filePaths = await this.list();

    return Promise.all(
      filePaths.map(async (filePath) => ({
        path: filePath,
        content: await this.read(filePath),
      })),
    );
  }

  async write(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  async writeJSON<T extends object>(filePath: string, content: T): Promise<void> {
    await this.write(filePath, `${JSON.stringify(content, null, 2)}\n`);
  }

  async delete(filePath: string): Promise<void> {
    try {
      await unlink(this.resolvePath(filePath));
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return;
      }

      throw error;
    }
  }

  async deleteAll(): Promise<void> {
    const filePaths = await this.list();

    await Promise.all(filePaths.map((filePath) => this.delete(filePath)));
  }
}
