import type { Worksheet } from 'exceljs';
import { Issue } from '../_models/issue.model';
import { JurisdictionEntry } from '../_models/jurisdiction.model';

export interface FileAnalysisDto {
  fileName: string;
  issues: Issue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface JurisdictionAnalysisDto extends FileAnalysisDto {
  entries: JurisdictionEntry[];
  duplicatesRemoved: number;
  zoneCount: number;
  unitCount: number;
}

export interface RegistrationAnalysisDto extends FileAnalysisDto {
  worksheet: Worksheet | null;
  sheetName: string;
  addressCol: number;
  unitCol: number;   // 0 = missing, will be added
  zoneCol: number;   // 0 = missing, will be added
  dataRows: number;
}
