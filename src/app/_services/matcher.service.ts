import { Injectable } from '@angular/core';
import { JurisdictionEntry } from '../_models/jurisdiction.model';
import { MatchResult } from '../_models/match-result.model';
import { normMatch } from '../_utils/text.util';

interface Phrase { pad: string; words: number; units: Set<string>; }

const NONE: MatchResult = { tier: 'NONE', zoneId: null, unit: null };

@Injectable({ providedIn: 'root' })
export class MatcherService {
  private full = new Map<string, Set<string>>();
  private phrases: Phrase[] = [];  // sorted by word count, longest first

  /** unit key = "zoneId|unit" */
  build(entries: JurisdictionEntry[]): void {
    this.full.clear();
    const phraseMap = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, k: string, u: string) => {
      if (!k) return;
      let s = m.get(k);
      if (!s) { s = new Set(); m.set(k, s); }
      s.add(u);
    };

    for (const e of entries) {
      const u = `${e.zoneId}|${e.unit}`;
      const key = normMatch(e.address);
      add(this.full, key, u);
      add(phraseMap, key, u);
    }

    this.phrases = [...phraseMap].map(([k, units]) => ({
      pad: ` ${k} `,
      words: k.split(/\s+/).filter(Boolean).length,
      units
    })).sort((a, b) => b.words - a.words);
  }

  match(address: string): MatchResult {
    const t = normMatch(address);
    if (t.length < 3) return NONE;

    const exact = this.full.get(t);
    if (exact) return this.resolve('EXACT', exact);

    const padded = ` ${t} `;
    const phraseHits: Set<string>[] = [];
    let bestWords = 0;
    for (const p of this.phrases) {
      if (phraseHits.length && p.words < bestWords) break;
      if (padded.includes(p.pad)) {
        bestWords = p.words;
        phraseHits.push(p.units);
      }
    }
    if (phraseHits.length) {
      const all = new Set<string>();
      for (const s of phraseHits) for (const u of s) all.add(u);
      return this.resolve('PHRASE', all);
    }

    const allWordsHits: Set<string>[] = [];
    bestWords = 0;
    for (const p of this.phrases) {
      if (allWordsHits.length && p.words < bestWords) break;
      const words = p.pad.trim().split(/\s+/).filter(Boolean);
      if (words.length > 1 && words.every(word => padded.includes(` ${word} `))) {
        bestWords = p.words;
        allWordsHits.push(p.units);
      }
    }
    if (allWordsHits.length) {
      const all = new Set<string>();
      for (const s of allWordsHits) for (const u of s) all.add(u);
      return this.resolve('ALL_WORDS', all);
    }
    return NONE;
  }

  private resolve(tier: 'EXACT' | 'PHRASE' | 'ALL_WORDS', units: Set<string>): MatchResult {
    if (units.size !== 1) return { tier: 'REVIEW', zoneId: null, unit: null };
    const [zoneId, unit] = [...units][0].split('|').map(Number);
    return { tier, zoneId, unit };
  }
}
