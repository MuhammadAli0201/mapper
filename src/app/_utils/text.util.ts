import { CITIES, CITY_ALIASES } from './constants';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  let t = cleanLine(s).toUpperCase();
  for (const [from, to] of Object.entries(CITY_ALIASES)) {
    t = t.replace(new RegExp('\\b' + escapeRe(from) + '$'), to);
  }
  t = t.replace(/\bFASIALABAD\b/g, 'FAISALABAD');
  t = t.replace(/(\d)\s*(RB|JB)\b/g, '$1 $2');
  return t;
}

/** Normalisation used for matching (both jurisdiction entries and registration addresses). */
export function normMatch(s: string): string {
  let t = s.toUpperCase();
  t = t.replace(/(\d)\s*(RB|JB)\b/g, '$1 $2');
  t = t.replace(/[^A-Z0-9 ]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function splitCity(body: string): { name: string; city: string } {
  for (const c of CITIES) {
    if (body.endsWith(c)) {
      return { name: body.slice(0, body.length - c.length).trim() || c, city: c };
    }
  }
  return { name: body, city: '' };
}

/** Key used to detect "same address" (ignores spaces and punctuation). */
export function placeKey(body: string): string {
  const { name, city } = splitCity(body);
  const normalized = name.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  return normalized + '@' + city;
}
