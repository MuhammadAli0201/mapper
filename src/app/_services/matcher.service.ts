import { Injectable } from '@angular/core';
import { JurisdictionEntry } from '../_models/jurisdiction.model';
import { MatchResult } from '../_models/match-result.model';
import { CITIES } from '../_utils/constants';
import { normMatch } from '../_utils/text.util';

interface Phrase { pad: string; words: number; units: Set<string>; }

const NONE: MatchResult = { tier: 'NONE', zoneId: null, unit: null };

@Injectable({ providedIn: 'root' })
export class MatcherService {
  private full = new Map<string, Set<string>>();       // whole address -> units
  private cityOnly = new Map<string, Set<string>>();   // city -> units (entry is only a city)
  private phrases: Phrase[] = [];                      // sorted by word count, longest first

  /** unit key = "zoneId|unit" */
  build(entries: JurisdictionEntry[]): void {
    this.full.clear();
    this.cityOnly.clear();
    const phraseMap = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, k: string, u: string) => {
      if (!k) return;
      let s = m.get(k);
      if (!s) { s = new Set(); m.set(k, s); }
      s.add(u);
    };
    for (const e of entries) {
      const u = `${e.zoneId}|${e.unit}`;
      const fullKey = normMatch(e.address);
      const nameKey = normMatch(e.name);
      add(this.full, fullKey, u);
      add(phraseMap, fullKey, u);                          // phrase WITH city
      if (nameKey !== e.city) add(phraseMap, nameKey, u);  // phrase WITHOUT city
      else add(this.cityOnly, e.city, u);                  // entry is just the city
    }
    this.phrases = [...phraseMap].map(([k, units]) => ({
      pad: ` ${k} `, words: k.split(' ').length, units
    })).sort((a, b) => b.words - a.words);
  }

  match(address: string): MatchResult {
    const t = normMatch(address);
    if (t.length < 3) return NONE;

    const exact = this.full.get(t);
    if (exact) return this.resolve('EXACT', exact);

    const padded = ` ${t} `;
    const hits: Set<string>[] = [];
    let bestWords = 0;
    for (const p of this.phrases) {
      if (hits.length && p.words < bestWords) break;        // longest phrase wins
      if (padded.includes(p.pad)) {
        bestWords = p.words;
        hits.push(p.units);
      }
    }
    if (hits.length) {
      const all = new Set<string>();
      for (const s of hits) for (const u of s) all.add(u);
      return this.resolve('PHRASE', all);
    }

    for (const c of CITIES) {
      if (padded.includes(` ${c} `)) {
        const u = this.cityOnly.get(c);
        if (u) return this.resolve('CITY', u);
      }
    }
    return NONE;
  }

  private resolve(tier: 'EXACT' | 'PHRASE' | 'CITY', units: Set<string>): MatchResult {
    if (units.size !== 1) return { tier: 'REVIEW', zoneId: null, unit: null };   // tie across units
    const [zoneId, unit] = [...units][0].split('|').map(Number);
    return { tier, zoneId, unit };
  }
}
