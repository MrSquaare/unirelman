export const shallowMerge = <TValue extends object>(
  target: TValue | undefined,
  source: TValue,
): TValue => {
  return {
    ...target,
    ...source,
  };
};

export const mergeArrayRecords = <TItem>(
  target: Readonly<Record<string, TItem[]>> | undefined,
  source: Readonly<Record<string, TItem[]>>,
): Record<string, TItem[]> => {
  const merged: Record<string, TItem[]> = Object.assign(Object.create(null), target);

  for (const [key, items] of Object.entries(source)) {
    merged[key] = [...(merged[key] ?? []), ...items];
  }

  return merged;
};
