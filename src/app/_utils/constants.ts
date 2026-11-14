export const SHEET_NAME = 'JURS A';
export const CITIES = ['TOBA TEK SINGH', 'FAISALABAD', 'CHINIOT', 'JHANG'];   // order matters (longest first)
export const CITY_ALIASES: Record<string, string> = {
  'FASIALABAD': 'FAISALABAD',
  'JHANB': 'JHANG',
  'TOBA TEK SING': 'TOBA TEK SINGH'
};
export const EXPECTED_ZONE_IDS: Record<string, number> = { LYALLPUR: 2, CHENAB: 3, JHANG: 4 };
export const ZONE_NAME_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(EXPECTED_ZONE_IDS).map(([name, id]) => [id, name])
);
export const ALLOWED_CHARS = /^[A-Z0-9 .&\-/']+$/;
export const HEADER_ROW = 1;
export const UNIT_ROW = 2;
export const FIRST_DATA_ROW = 3;
export const NEAR_SAME_UNIT = 1;
export const NEAR_CROSS_UNIT = 1;
export const REG_ADDRESS_HEADER = 'PERSONAL_ADDRESS';
export const REG_UNIT_HEADER = 'UNIT';
export const REG_ZONE_HEADER = 'ZONE';
