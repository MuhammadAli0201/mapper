export type MatchTier = 'EXACT' | 'PHRASE' | 'CITY' | 'NONE' | 'REVIEW';

export interface MatchResult {
  tier: MatchTier;
  zoneId: number | null;
  unit: number | null;
}
