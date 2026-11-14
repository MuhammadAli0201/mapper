export interface ZoneInfo {
  name: string;
  col: number;
  id: number | null;
  where: string;
}

export interface UnitColumn {
  zone: string;
  zoneId: number | null;
  unit: number;
  col: number;
  label: string;
}

/** One unique address spelling of a place in one unit. */
export interface JurisdictionEntry {
  zone: string;
  zoneId: number;
  unit: number;
  cell: string;
  address: string;   // full normalised line, e.g. "NISAR COLONY FAISALABAD"
  name: string;      // without city
  city: string;
}
