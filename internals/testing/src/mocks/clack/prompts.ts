import {
  cancel,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { vi, type MockInstance } from "vitest";

vi.mock("@clack/prompts", async (importActual) => {
  const actual = await importActual<typeof import("@clack/prompts")>();

  return {
    ...actual,
    cancel: vi.fn(),
    intro: vi.fn(),
    isCancel: vi.fn(actual.isCancel),
    log: {
      ...actual.log,
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      message: vi.fn(),
    },
    multiselect: vi.fn(),
    outro: vi.fn(),
    select: vi.fn(),
    spinner: vi.fn(() => ({
      start: vi.fn(),
      clear: vi.fn(),
    })),
    text: vi.fn(),
  };
});

export const mockedCancel = vi.mocked(cancel);
export const mockedIntro = vi.mocked(intro);
export const mockedIsCancel = vi.mocked(isCancel);
export const mockedLogError = vi.mocked(log.error);
export const mockedLogInfo = vi.mocked(log.info);
export const mockedLogMessage = vi.mocked(log.message);
export const mockedLogWarn = vi.mocked(log.warn);
export const mockedMultiselect: MockInstance<typeof multiselect> = vi.mocked(multiselect);
export const mockedOutro = vi.mocked(outro);
export const mockedSelect: MockInstance<typeof select> = vi.mocked(select);
export const mockedSpinner = vi.mocked(spinner);
export const mockedText: MockInstance<typeof text> = vi.mocked(text);
export { CANCEL_SYMBOL } from "@clack/prompts";
