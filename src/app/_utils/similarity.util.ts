// Ratcliff/Obershelp ratio, same idea as Python difflib.SequenceMatcher.ratio()
function longestMatch(a: string, b: string, alo: number, ahi: number, blo: number, bhi: number): [number, number, number] {
  let bi = alo, bj = blo, bk = 0;
  let prev = new Array<number>(bhi - blo + 1).fill(0);
  for (let i = alo; i < ahi; i++) {
    const cur = new Array<number>(bhi - blo + 1).fill(0);
    for (let j = blo; j < bhi; j++) {
      if (a[i] === b[j]) {
        const k = prev[j - blo] + 1;
        cur[j - blo + 1] = k;
        if (k > bk) { bk = k; bi = i - k + 1; bj = j - k + 1; }
      }
    }
    prev = cur;
  }
  return [bi, bj, bk];
}

function matchCount(a: string, b: string, alo: number, ahi: number, blo: number, bhi: number): number {
  if (alo >= ahi || blo >= bhi) return 0;
  const [i, j, k] = longestMatch(a, b, alo, ahi, blo, bhi);
  if (!k) return 0;
  return k + matchCount(a, b, alo, i, blo, j) + matchCount(a, b, i + k, ahi, j + k, bhi);
}

export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  return (2 * matchCount(a, b, 0, a.length, 0, b.length)) / (a.length + b.length);
}
