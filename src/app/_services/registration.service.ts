import { Injectable, inject } from '@angular/core';
import type { Worksheet } from 'exceljs';
import { ExcelService } from './excel.service';
import { MatcherService } from './matcher.service';
import { RegistrationAnalysisDto } from '../_dtos/analysis.dto';
import { ProcessResultDto, UnitCount } from '../_dtos/process-result.dto';
import { Issue } from '../_models/issue.model';
import { REG_ADDRESS_HEADER, REG_UNIT_HEADER, REG_ZONE_HEADER, ZONE_NAME_BY_ID } from '../_utils/constants';
import { cellToText } from '../_utils/excel.util';
import { finalize } from '../_utils/issue.util';

const tick = () => new Promise<void>(r => setTimeout(r, 0));
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private excel = inject(ExcelService);
  private matcher = inject(MatcherService);

  async analyze(file: File): Promise<RegistrationAnalysisDto> {
    const wb = await this.excel.read(file);
    const issues: Issue[] = [];
    const base = { fileName: file.name, worksheet: null as Worksheet | null, sheetName: '', addressCol: 0, unitCol: 0, zoneCol: 0, dataRows: 0 };

    let ws: Worksheet | undefined;
    let headers = new Map<string, number>();
    for (const w of wb.worksheets) {
      const h = this.headerMap(w);
      if (h.has(REG_ADDRESS_HEADER)) { ws = w; headers = h; break; }
    }
    if (!ws) {
      issues.push({ severity: 'error', code: 'E_NO_ADDRESS_COL', where: 'row 1',
        message: `No "${REG_ADDRESS_HEADER}" column found in row 1 of any sheet` });
      return { ...base, ...finalize(issues) };
    }

    const addressCol = headers.get(REG_ADDRESS_HEADER)!;
    const unitCol = headers.get(REG_UNIT_HEADER) ?? 0;
    const zoneCol = headers.get(REG_ZONE_HEADER) ?? 0;

    let dataRows = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      if (cellToText(ws.getRow(r).getCell(addressCol).value).kind !== 'blank') dataRows++;
    }
    if (dataRows === 0) {
      issues.push({ severity: 'error', code: 'E_EMPTY_FILE', where: ws.name,
        message: `No row has a value in ${REG_ADDRESS_HEADER}` });
    }
    if (!unitCol) issues.push({ severity: 'info', code: 'I_ADD_UNIT', where: ws.name, message: 'A "UNIT" column will be added at the end.' });
    if (!zoneCol) issues.push({ severity: 'info', code: 'I_ADD_ZONE', where: ws.name, message: 'A "ZONE" column will be added at the end.' });

    return { ...base, ...finalize(issues), worksheet: ws, sheetName: ws.name, addressCol, unitCol, zoneCol, dataRows };
  }

  /** Overwrites UNIT and ZONE for every row. The jurisdiction index must already be built in MatcherService. */
  async process(a: RegistrationAnalysisDto, onProgress: (percent: number) => void): Promise<ProcessResultDto> {
    const ws = a.worksheet!;
    const header = ws.getRow(1);
    let next = Math.max(ws.columnCount, a.addressCol, a.unitCol, a.zoneCol) + 1;
    let unitCol = a.unitCol;
    let zoneCol = a.zoneCol;
    const addHeader = (name: string): number => {
      const col = next++;
      const c = header.getCell(col);
      c.value = name;
      c.style = { ...header.getCell(a.addressCol).style };
      return col;
    };
    if (!unitCol) unitCol = addHeader(REG_UNIT_HEADER);
    if (!zoneCol) zoneCol = addHeader(REG_ZONE_HEADER);

    const stat = { total: 0, blank: 0, exact: 0, phrase: 0, city: 0, none: 0, review: 0 };
    const counts = new Map<string, number>();
    const last = ws.rowCount;
    const CHUNK = 500;

    for (let start = 2; start <= last; start += CHUNK) {
      const end = Math.min(start + CHUNK - 1, last);
      for (let r = start; r <= end; r++) {
        const row = ws.getRow(r);
        const address = cellToText(row.getCell(a.addressCol).value).text;
        if (!address.trim()) {
          row.getCell(unitCol).value = null;
          row.getCell(zoneCol).value = null;
          stat.blank++;
          continue;
        }
        const m = this.matcher.match(address);
        row.getCell(unitCol).value = m.unit;
        row.getCell(zoneCol).value = m.zoneId;
        stat.total++;
        switch (m.tier) {
          case 'EXACT': stat.exact++; break;
          case 'PHRASE': stat.phrase++; break;
          case 'CITY': stat.city++; break;
          case 'REVIEW': stat.review++; break;
          default: stat.none++;
        }
        if (m.zoneId !== null && m.unit !== null) {
          const k = `${m.zoneId}|${m.unit}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
      onProgress(Math.round((end / Math.max(last, 1)) * 100));
      await tick();   // let the progress bar repaint
    }

    const byZoneUnit: UnitCount[] = [...counts].map(([k, count]) => {
      const [zoneId, unit] = k.split('|').map(Number);
      return { zoneId, zone: ZONE_NAME_BY_ID[zoneId] ?? String(zoneId), unit, count };
    }).sort((x, y) => x.zoneId - y.zoneId || x.unit - y.unit);

    const buf = await ws.workbook.xlsx.writeBuffer();
    const blob = new Blob([buf as BlobPart], { type: XLSX_MIME });
    const fileName = a.fileName.replace(/\.xlsx?$/i, '') + '_processed.xlsx';
    onProgress(100);
    return { ...stat, byZoneUnit, blob, fileName };
  }

  private headerMap(ws: Worksheet): Map<string, number> {
    const map = new Map<string, number>();
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      const t = cellToText(cell.value).text.trim().toUpperCase();
      if (t && !map.has(t)) map.set(t, col);
    });
    return map;
  }
}
