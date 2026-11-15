export type MatchTier = 'EXACT' | 'PHRASE' | 'ALL_WORDS' | 'NONE' | 'REVIEW';

export interface MatchResult {
  tier: MatchTier;
  zoneId: number | null;
  unit: number | null;
}
