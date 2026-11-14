import type { Mock } from "vitest";

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? Mock<(...args: TArgs) => TReturn>
    : T[K];
};

export type MockedClass<T> = new (...args: any[]) => MockedObject<T>;
