export type NonEmptyArray<TItem> = readonly [TItem, ...TItem[]];

export const isNonEmptyArray = <TItem>(items: readonly TItem[]): items is NonEmptyArray<TItem> => {
  return items.length > 0;
};
