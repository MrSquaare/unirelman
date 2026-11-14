import { access, mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { vi } from "vitest";

vi.mock("node:fs/promises", async (importActual) => {
  const actual = await importActual<typeof import("node:fs/promises")>();

  return {
    ...actual,
    access: vi.fn(),
    mkdir: vi.fn(),
    mkdtemp: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    rm: vi.fn(),
    unlink: vi.fn(),
    writeFile: vi.fn(),
  };
});

export const mockedAccess = vi.mocked(access);
export const mockedMkdir = vi.mocked(mkdir);
export const mockedMkdtemp = vi.mocked(mkdtemp);
export const mockedReadFile = vi.mocked(readFile);
export const mockedReaddir = vi.mocked(readdir);
export const mockedRm = vi.mocked(rm);
export const mockedUnlink = vi.mocked(unlink);
export const mockedWriteFile = vi.mocked(writeFile);
