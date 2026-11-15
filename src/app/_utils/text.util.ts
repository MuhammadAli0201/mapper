/** Trim one line and collapse tabs / NBSP / repeated spaces. */
export function cleanLine(s: string): string {
  return s.replace(/[\s\u00a0]+/g, ' ').trim();
}

/** Remove a leading "n) " prefix. */
export function stripPrefix(line: string): string {
  return line.replace(/^\s*\d+\)\s*/, '');
}

/** Canonical text of ONE jurisdiction address line (no "n) " prefix). */
export function normBody(s: string): string {
  return cleanLine(s).toUpperCase();
}

/** Normalisation used for matching (both jurisdiction entries and registration addresses). */
export function normMatch(s: string): string {
  let t = s.toUpperCase();
  t = t.replace(/[^A-Z0-9]/g, ' ');
  t = t.replace(/(\d)([A-Z])/g, '$1 $2');
  t = t.replace(/([A-Z])(\d)/g, '$1 $2');
  return t.replace(/\s+/g, ' ').trim();
}

/** Key used to detect "same address" (ignores spaces and punctuation). */
export function placeKey(body: string): string {
  return normMatch(body);
}
