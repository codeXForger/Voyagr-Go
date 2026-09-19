/** Returns a copy of `list` with the item at `from` moved to index `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const target = Math.min(Math.max(to, 0), list.length - 1);
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
