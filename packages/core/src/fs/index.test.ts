import {
  mockedAccess,
  mockedMkdir,
  mockedReadFile,
  mockedReaddir,
  mockedUnlink,
  mockedWriteFile,
} from "@unirelman/testing/mocks/node/fs-promises";
import { InvalidJSONError } from "@unirelman/utils";
import { mockedParseJSON } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { FS } from ".";
import { CoreFileNotFoundError } from "../errors";
import { CONFIG_CWD } from "../testing/fixtures/constants";

describe("FS", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should resolve dirPath with cwd and subDir", () => {
      const fs = new FS(CONFIG_CWD, "folder");

      expect(fs["dirPath"]).toEqual(`${CONFIG_CWD}/folder`);
    });
  });

  describe("list", () => {
    it("should return all file paths", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedReaddir.mockResolvedValueOnce([
        { name: "a.md", isFile: () => true },
        { name: "nested", isFile: () => false },
        { name: "b.md", isFile: () => true },
      ] as Parameters<typeof mockedReaddir.mockResolvedValueOnce>[0] & object);

      await expect(fs.list()).resolves.toEqual(["a.md", "b.md"]);

      expect(mockedReaddir).toHaveBeenCalledTimes(1);
      expect(mockedReaddir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, {
        withFileTypes: true,
      });
    });

    it("should return empty array when folder does not exist", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedReaddir.mockRejectedValueOnce({ code: "ENOENT" });

      await expect(fs.list()).resolves.toEqual([]);

      expect(mockedReaddir).toHaveBeenCalledTimes(1);
      expect(mockedReaddir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, {
        withFileTypes: true,
      });
    });

    it("should throw on unexpected list errors", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedReaddir.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.list()).rejects.toThrow(new Error("Unexpected error"));

      expect(mockedReaddir).toHaveBeenCalledTimes(1);
      expect(mockedReaddir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, {
        withFileTypes: true,
      });
    });
  });

  describe("resolvePath", () => {
    it("should resolve the file path inside the FS directory", () => {
      const fs = new FS(CONFIG_CWD, "folder");

      expect(fs.resolvePath("nested/a.md")).toEqual(`${CONFIG_CWD}/folder/nested/a.md`);
    });

    it("should keep an absolute file path", () => {
      const fs = new FS(CONFIG_CWD, "folder");

      expect(fs.resolvePath("/other/a.md")).toEqual("/other/a.md");
    });
  });

  describe("exists", () => {
    it("should return true when file exists", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const resolvePathSpy = vi.spyOn(fs, "resolvePath");

      mockedAccess.mockResolvedValueOnce(undefined);

      await expect(fs.exists("a.md")).resolves.toEqual(true);

      expect(mockedAccess).toHaveBeenCalledTimes(1);
      expect(mockedAccess).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`);
      expect(resolvePathSpy).toHaveBeenCalledTimes(1);
      expect(resolvePathSpy).toHaveBeenNthCalledWith(1, "a.md");
    });

    it("should return false when file does not exist", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedAccess.mockRejectedValueOnce({ code: "ENOENT" });

      await expect(fs.exists("a.md")).resolves.toEqual(false);

      expect(mockedAccess).toHaveBeenCalledTimes(1);
      expect(mockedAccess).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`);
    });

    it("should throw when access fails with an unexpected error", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedAccess.mockRejectedValueOnce(new Error("Permission denied"));

      await expect(fs.exists("a.md")).rejects.toThrow(new Error("Permission denied"));

      expect(mockedAccess).toHaveBeenCalledTimes(1);
      expect(mockedAccess).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`);
    });
  });

  describe("read", () => {
    it("should return file content", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const resolvePathSpy = vi.spyOn(fs, "resolvePath");

      mockedReadFile.mockResolvedValueOnce("Hello");

      await expect(fs.read("a.md")).resolves.toEqual("Hello");

      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      expect(mockedReadFile).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`, "utf-8");
      expect(resolvePathSpy).toHaveBeenCalledTimes(1);
      expect(resolvePathSpy).toHaveBeenNthCalledWith(1, "a.md");
    });

    it("should return fallback on ENOENT when fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedReadFile.mockRejectedValueOnce({ code: "ENOENT" });

      await expect(fs.read("a.md", "default content")).resolves.toEqual("default content");

      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      expect(mockedReadFile).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`, "utf-8");
    });

    it("should throw file not found error on ENOENT when no fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const cause = { code: "ENOENT" };

      mockedReadFile.mockRejectedValueOnce(cause);

      await expect(fs.read("a.md")).rejects.toThrow(
        new CoreFileNotFoundError(`${CONFIG_CWD}/folder/a.md`, { cause }),
      );

      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      expect(mockedReadFile).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`, "utf-8");
    });

    it("should rethrow unexpected read error when fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedReadFile.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.read("a.md", "default content")).rejects.toThrow(
        new Error("Unexpected error"),
      );

      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      expect(mockedReadFile).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/a.md`, "utf-8");
    });
  });

  describe("readJSON", () => {
    const schema = z.object({ key: z.string() });

    it("should return parsed json content", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const resolvePathSpy = vi.spyOn(fs, "resolvePath");
      const readSpy = vi.spyOn(fs, "read");

      readSpy.mockResolvedValueOnce('{"key":"value"}');

      await expect(fs.readJSON("file.json", schema)).resolves.toEqual({ key: "value" });

      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "file.json");
      expect(mockedParseJSON).toHaveBeenCalledTimes(1);
      expect(mockedParseJSON).toHaveBeenNthCalledWith(
        1,
        `${CONFIG_CWD}/folder/file.json`,
        '{"key":"value"}',
        schema,
      );
      expect(resolvePathSpy).toHaveBeenCalledTimes(1);
      expect(resolvePathSpy).toHaveBeenNthCalledWith(1, "file.json");
    });

    it("should return fallback when file is not found and fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const readSpy = vi.spyOn(fs, "read");
      const fallback = { key: "fallback" };

      readSpy.mockRejectedValueOnce(new CoreFileNotFoundError(`${CONFIG_CWD}/folder/file.json`));

      await expect(fs.readJSON("file.json", schema, fallback)).resolves.toEqual(fallback);

      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "file.json");
      expect(mockedParseJSON).not.toHaveBeenCalled();
    });

    it("should rethrow file not found error when fallback is not provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const readSpy = vi.spyOn(fs, "read");
      const error = new CoreFileNotFoundError(`${CONFIG_CWD}/folder/file.json`);

      readSpy.mockRejectedValueOnce(error);

      await expect(fs.readJSON("file.json", schema)).rejects.toThrow(error);

      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "file.json");
      expect(mockedParseJSON).not.toHaveBeenCalled();
    });

    it("should rethrow unexpected read error when fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const readSpy = vi.spyOn(fs, "read");

      readSpy.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.readJSON("file.json", schema, { key: "fallback" })).rejects.toThrow(
        new Error("Unexpected error"),
      );

      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "file.json");
      expect(mockedParseJSON).not.toHaveBeenCalled();
    });

    it("should rethrow invalid json error when fallback is provided", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const readSpy = vi.spyOn(fs, "read");

      readSpy.mockResolvedValueOnce("{ invalid json }");

      await expect(fs.readJSON("file.json", schema, { key: "fallback" })).rejects.toThrow(
        new InvalidJSONError(
          `${CONFIG_CWD}/folder/file.json`,
          "Expected property name or '}' in JSON at position 2 (line 1 column 3)",
        ),
      );

      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "file.json");
      expect(mockedParseJSON).toHaveBeenCalledTimes(1);
      expect(mockedParseJSON).toHaveBeenNthCalledWith(
        1,
        `${CONFIG_CWD}/folder/file.json`,
        "{ invalid json }",
        schema,
      );
    });
  });

  describe("readAll", () => {
    it("should return discovered files with content", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const readSpy = vi.spyOn(fs, "read");

      listSpy.mockResolvedValueOnce(["a.md", "b.md"]);
      readSpy.mockResolvedValueOnce("A").mockResolvedValueOnce("B");

      await expect(fs.readAll()).resolves.toEqual([
        { path: "a.md", content: "A" },
        { path: "b.md", content: "B" },
      ]);

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(readSpy).toHaveBeenCalledTimes(2);
      expect(readSpy).toHaveBeenNthCalledWith(1, "a.md");
      expect(readSpy).toHaveBeenNthCalledWith(2, "b.md");
    });

    it("should return empty array when no files are discovered", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const readSpy = vi.spyOn(fs, "read");

      listSpy.mockResolvedValueOnce([]);

      await expect(fs.readAll()).resolves.toEqual([]);

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(readSpy).not.toHaveBeenCalled();
    });

    it("should throw if one read fails", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const readSpy = vi.spyOn(fs, "read");

      listSpy.mockResolvedValueOnce(["a.md"]);
      readSpy.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.readAll()).rejects.toThrow(new Error("Unexpected error"));

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenNthCalledWith(1, "a.md");
    });
  });

  describe("write", () => {
    it("should create directory and write file", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const resolvePathSpy = vi.spyOn(fs, "resolvePath");
      const content = "value";

      mockedMkdir.mockResolvedValueOnce(undefined);
      mockedWriteFile.mockResolvedValueOnce(undefined);

      await expect(fs.write("a.md", content)).resolves.toEqual(undefined);

      expect(mockedMkdir).toHaveBeenCalledTimes(1);
      expect(mockedMkdir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, { recursive: true });
      expect(mockedWriteFile).toHaveBeenCalledTimes(1);
      expect(mockedWriteFile).toHaveBeenNthCalledWith(
        1,
        `${CONFIG_CWD}/folder/a.md`,
        content,
        "utf-8",
      );
      expect(resolvePathSpy).toHaveBeenCalledTimes(1);
      expect(resolvePathSpy).toHaveBeenNthCalledWith(1, "a.md");
    });

    it("should throw on unexpected mkdir error", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedMkdir.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.write("a.md", "value")).rejects.toThrow(new Error("Unexpected error"));

      expect(mockedMkdir).toHaveBeenCalledTimes(1);
      expect(mockedMkdir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, { recursive: true });
      expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it("should throw on unexpected writeFile error", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedMkdir.mockResolvedValueOnce(undefined);
      mockedWriteFile.mockRejectedValueOnce(new Error("Write error"));

      await expect(fs.write("a.md", "value")).rejects.toThrow(new Error("Write error"));

      expect(mockedMkdir).toHaveBeenCalledTimes(1);
      expect(mockedMkdir).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder`, { recursive: true });
      expect(mockedWriteFile).toHaveBeenCalledTimes(1);
      expect(mockedWriteFile).toHaveBeenNthCalledWith(
        1,
        `${CONFIG_CWD}/folder/a.md`,
        "value",
        "utf-8",
      );
    });
  });

  describe("writeJSON", () => {
    it("should call write with indented json ending with a newline", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const writeSpy = vi.spyOn(fs, "write");
      const content = { key: "value" };

      writeSpy.mockResolvedValueOnce(undefined);

      await expect(fs.writeJSON("file.json", content)).resolves.toEqual(undefined);

      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenNthCalledWith(1, "file.json", '{\n  "key": "value"\n}\n');
    });
  });

  describe("delete", () => {
    it("should delete file", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const resolvePathSpy = vi.spyOn(fs, "resolvePath");

      mockedUnlink.mockResolvedValueOnce(undefined);

      await expect(fs.delete("file.json")).resolves.toEqual(undefined);

      expect(mockedUnlink).toHaveBeenCalledTimes(1);
      expect(mockedUnlink).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/file.json`);
      expect(resolvePathSpy).toHaveBeenCalledTimes(1);
      expect(resolvePathSpy).toHaveBeenNthCalledWith(1, "file.json");
    });

    it("should do nothing if file does not exist", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedUnlink.mockRejectedValueOnce({ code: "ENOENT" });

      await expect(fs.delete("file.json")).resolves.toEqual(undefined);

      expect(mockedUnlink).toHaveBeenCalledTimes(1);
      expect(mockedUnlink).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/file.json`);
    });

    it("should throw unexpected delete errors", async () => {
      const fs = new FS(CONFIG_CWD, "folder");

      mockedUnlink.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.delete("file.json")).rejects.toThrow(new Error("Unexpected error"));

      expect(mockedUnlink).toHaveBeenCalledTimes(1);
      expect(mockedUnlink).toHaveBeenNthCalledWith(1, `${CONFIG_CWD}/folder/file.json`);
    });
  });

  describe("deleteAll", () => {
    it("should delete all listed files", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const deleteSpy = vi.spyOn(fs, "delete");

      listSpy.mockResolvedValueOnce(["a.json", "b.json"]);
      deleteSpy.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

      await expect(fs.deleteAll()).resolves.toEqual(undefined);

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(deleteSpy).toHaveBeenCalledTimes(2);
      expect(deleteSpy).toHaveBeenNthCalledWith(1, "a.json");
      expect(deleteSpy).toHaveBeenNthCalledWith(2, "b.json");
    });

    it("should do nothing when list is empty", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const deleteSpy = vi.spyOn(fs, "delete");

      listSpy.mockResolvedValueOnce([]);

      await expect(fs.deleteAll()).resolves.toEqual(undefined);

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("should throw when list fails", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");

      listSpy.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.deleteAll()).rejects.toThrow(new Error("Unexpected error"));

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
    });

    it("should throw when one delete fails", async () => {
      const fs = new FS(CONFIG_CWD, "folder");
      const listSpy = vi.spyOn(fs, "list");
      const deleteSpy = vi.spyOn(fs, "delete");

      listSpy.mockResolvedValueOnce(["a.json"]);
      deleteSpy.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(fs.deleteAll()).rejects.toThrow(new Error("Unexpected error"));

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenNthCalledWith(1);
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenNthCalledWith(1, "a.json");
    });
  });
});
