export const mergeMaps = <TKey, TValue>(
  target: ReadonlyMap<TKey, TValue> | undefined,
  source: ReadonlyMap<TKey, TValue>,
): Map<TKey, TValue> => {
  return new Map([...(target ?? []), ...source]);
};

export const mergeArrayMaps = <TKey, TItem>(
  target: ReadonlyMap<TKey, TItem[]> | undefined,
  source: ReadonlyMap<TKey, TItem[]>,
): Map<TKey, TItem[]> => {
  const merged = new Map(target);

  for (const [key, items] of source) {
    merged.set(key, [...(merged.get(key) ?? []), ...items]);
  }

  return merged;
};
