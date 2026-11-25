export type ObjectGeneratorOptions<T, TAdditionalOptions extends object = object> = (
  | Partial<T>
  | {
      override?: T;
      extends?: Partial<T>;
    }
) &
  TAdditionalOptions;

export const defineObjectGenerator = <T extends object, TOptions extends object = object>(
  defaultBuilder: (options?: ObjectGeneratorOptions<T, TOptions>) => T,
) => {
  return (options?: ObjectGeneratorOptions<T, TOptions>): T => {
    if (!options) {
      return defaultBuilder();
    }

    if ("override" in options && options.override !== undefined) {
      return options.override;
    }

    const defaults = defaultBuilder(options);

    if ("extends" in options && options.extends) {
      return { ...defaults, ...options.extends };
    }

    return { ...defaults, ...options };
  };
};

export type MapGeneratorOptions<TKey, TValue> = {
  override?: ReadonlyMap<TKey, TValue>;
  extends?: ReadonlyMap<TKey, TValue>;
};

export const defineMapGenerator = <TKey, TValue>(defaultBuilder: () => Map<TKey, TValue>) => {
  return (options?: MapGeneratorOptions<TKey, TValue>): Map<TKey, TValue> => {
    if (options?.override !== undefined) {
      return new Map(options.override);
    }

    return new Map([...defaultBuilder(), ...(options?.extends ?? [])]);
  };
};
