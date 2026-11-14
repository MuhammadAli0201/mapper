import { Injectable } from '@angular/core';
import type { Workbook } from 'exceljs';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  /** ExcelJS is loaded lazily so it stays out of the initial bundle. */
  async read(file: File): Promise<Workbook> {
    const mod: any = await import('exceljs');
    const ExcelJS = mod.default ?? mod;
    const wb: Workbook = new ExcelJS.Workbook();
    await wb.xlsx.load((await file.arrayBuffer()) as any);
    return wb;
  }
}
