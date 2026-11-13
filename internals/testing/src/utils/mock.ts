import type { MockInstance } from "vitest";

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? MockInstance<(...args: TArgs) => TReturn>
    : T[K];
};

export type MockedClass<T> = new (...args: any[]) => MockedObject<T>;
