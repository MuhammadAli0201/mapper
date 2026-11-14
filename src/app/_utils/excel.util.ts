import type { CellValue } from 'exceljs';

export type CellKind = 'blank' | 'text' | 'other';

/** Classify a cell value: blank (empty / whitespace), text, or other (number, date, error...). */
export function cellToText(v: CellValue | undefined): { kind: CellKind; text: string } {
  if (v === null || v === undefined) return { kind: 'blank', text: '' };
  if (typeof v === 'string') {
    return v.trim() === '' ? { kind: 'blank', text: '' } : { kind: 'text', text: v };
  }
  if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) {
    return { kind: 'other', text: String(v) };
  }
  const o: any = v;
  if (Array.isArray(o.richText)) return cellToText(o.richText.map((r: any) => r.text).join(''));
  if ('result' in o) return cellToText(o.result);          // formula cell
  if (typeof o.text === 'string') return cellToText(o.text); // hyperlink cell
  return { kind: 'other', text: '' };
}

export function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
