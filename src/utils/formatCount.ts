/** Formats a raw count with thousands separators, e.g. 1531 -> "1,531". */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
