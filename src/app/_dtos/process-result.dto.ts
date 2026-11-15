export interface UnitCount {
  zoneId: number;
  zone: string;
  unit: number;
  count: number;
}

export interface ProcessResultDto {
  total: number;      // rows that had an address
  blank: number;      // rows with an empty address (UNIT/ZONE cleared)
  exact: number;
  phrase: number;
  allWords: number;
  none: number;
  review: number;
  byZoneUnit: UnitCount[];
  blob: Blob;
  fileName: string;
}
