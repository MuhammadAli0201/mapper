import { Injectable, inject } from '@angular/core';
import type { Workbook, Worksheet } from 'exceljs';
import { ExcelService } from './excel.service';
import { JurisdictionAnalysisDto } from '../_dtos/analysis.dto';
import { Issue, Severity } from '../_models/issue.model';
import { JurisdictionEntry, UnitColumn, ZoneInfo } from '../_models/jurisdiction.model';
import {
  ALLOWED_CHARS, FIRST_DATA_ROW, HEADER_ROW, NEAR_CROSS_UNIT,
  NEAR_SAME_UNIT, SHEET_NAME, UNIT_ROW
} from '../_utils/constants';
import { cellToText, colLetter } from '../_utils/excel.util';
import { finalize } from '../_utils/issue.util';
import { similarity } from '../_utils/similarity.util';
import { normBody, placeKey } from '../_utils/text.util';

type AddFn = (severity: Severity, code: string, where: string, message: string) => void;
interface Line { zone: string; zoneId: number; unit: number; cell: string; body: string; }

const tick = () => new Promise<void>(r => setTimeout(r, 0));

@Injectable({ providedIn: 'root' })
export class JurisdictionService {
  private excel = inject(ExcelService);

  async analyze(file: File): Promise<JurisdictionAnalysisDto> {
    const wb = await this.excel.read(file);
    const issues: Issue[] = [];
    const add: AddFn = (severity, code, where, message) => issues.push({ severity, code, where, message });
    const result = (extra: Partial<JurisdictionAnalysisDto> = {}): JurisdictionAnalysisDto => ({
      fileName: file.name, ...finalize(issues),
      entries: [], duplicatesRemoved: 0, zoneCount: 0, unitCount: 0, ...extra
    });

    const ws = this.findSheet(wb);
    if (!ws) {
      add('error', 'E_NO_SHEET', 'workbook', `Sheet "${SHEET_NAME}" (with "ZONE:" headers in row 1) was not found`);
      return result();
    }

    const { zones, units } = this.parseLayout(ws, add);
    if (!units.length) {
      add('error', 'E_NO_UNITS', 'row 2', 'No "UNIT n" headers found in row 2');
      return result({ zoneCount: zones.length });
    }

    // ---- duplicate unit numbers inside a zone
    const perZone = new Map<string, number[]>();
    for (const u of units) perZone.set(u.zone, [...(perZone.get(u.zone) ?? []), u.unit]);
    for (const [zone, nums] of perZone) {
      if (new Set(nums).size !== nums.length) add('error', 'E_UNIT_DUP', zone, `Duplicate unit numbers in ${zone}: ${nums.join(', ')}`);
    }

    // ---- cells and lines
    const lines: Line[] = [];
    const lastRow = ws.rowCount;
    for (const u of units) {
      for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
        const cell = ws.getCell(r, u.col);
        const c = cellToText(cell.value);
        if (c.kind === 'blank') continue;                      // blank cells are ignored
        const addr = cell.address;
        if (c.kind === 'other') {
          add('error', 'E_NOT_TEXT', addr, `Cell is not text: ${JSON.stringify(c.text)}`);
          continue;
        }

        let raw = c.text.split(/\r?\n/).map(l => l.replace(/[\s\u00a0]+/g, ' ').trim());
        while (raw.length && !raw[0]) raw.shift();
        while (raw.length && !raw[raw.length - 1]) raw.pop();
        if (!raw.length) continue;

        if (raw.some(l => !l)) add('error', 'E_EMPTY_LINE', addr, 'Empty line inside the cell');
        const nonEmpty = raw.filter(l => l);
        const multi = nonEmpty.length > 1;

        const seq: number[] = [];
        let missingPrefix = false;
        const bodies = new Set<string>();
        for (const l of nonEmpty) {
          const m = l.match(/^(\d+)\) (?=\S)/);
          if (multi) {
            if (m) seq.push(+m[1]); else missingPrefix = true;
          } else if (/^\d+\)/.test(l)) {
            add('error', 'E_NUMBERING', addr, `Single-address cell must not be numbered: "${l}"`);
          }
          const body = normBody(m ? l.slice(m[0].length) : l.replace(/^\d+\)\s*/, ''));
          if (!ALLOWED_CHARS.test(body)) add('error', 'E_CHARS', addr, `Unexpected characters: "${body}"`);
          bodies.add(body);   // identical lines inside one cell collapse silently
        }
        if (multi && (missingPrefix || seq.some((n, i) => n !== i + 1) || seq.length !== nonEmpty.length)) {
          add('error', 'E_NUMBERING', addr, 'Multi-address cell must be numbered "1) ", "2) ", ... in order');
        }
        for (const body of bodies) lines.push({ zone: u.zone, zoneId: u.zoneId ?? 0, unit: u.unit, cell: addr, body });
      }
    }

    // ---- same address in several places
    const byKey = new Map<string, Line[]>();
    for (const l of lines) {
      const k = placeKey(l.body);
      byKey.set(k, [...(byKey.get(k) ?? []), l]);
    }
    let duplicatesRemoved = 0;
    for (const list of byKey.values()) {
      const unitSet = new Set(list.map(l => `${l.zone}|${l.unit}`));
      const cells = [...new Set(list.map(l => l.cell))];
      if (unitSet.size > 1) {
        const where = list.map(l => `${l.zone} U${l.unit} (${l.cell})`).join(', ');
        add('error', 'E_CONFLICT', cells.join(', '), `"${list[0].body}" is in several units: ${where}`);
      } else if (cells.length > 1) {
        duplicatesRemoved += cells.length - 1;
        add('warning', 'W_REPEATED_SAME_UNIT', cells.join(', '),
          `"${list[0].body}" appears in ${cells.length} cells of ${list[0].zone} unit ${list[0].unit}; one entry is kept`);
      }
    }

    // ---- similar names (warnings only)
    await tick();
    this.similarNames(lines, add);

    // ---- unique entries for the matcher
    const entryMap = new Map<string, JurisdictionEntry>();
    for (const l of lines) {
      const key = `${l.zone}|${l.unit}|${l.body}`;
      if (entryMap.has(key)) continue;
      entryMap.set(key, { zone: l.zone, zoneId: l.zoneId, unit: l.unit, cell: l.cell, address: l.body });
    }

    return result({
      entries: [...entryMap.values()],
      duplicatesRemoved,
      zoneCount: zones.length,
      unitCount: units.length
    });
  }

  // ------------------------------------------------------------------

  private findSheet(wb: Workbook): Worksheet | undefined {
    const byName = wb.worksheets.find(w => w.name.trim().toUpperCase() === SHEET_NAME);
    if (byName) return byName;
    return wb.worksheets.find(w => {
      let found = false;
      w.getRow(HEADER_ROW).eachCell({ includeEmpty: false }, cell => {
        if (/^ZONE\s*:/i.test(cellToText(cell.value).text.trim())) found = true;
      });
      return found;
    });
  }

  private parseLayout(ws: Worksheet, add: AddFn): { zones: ZoneInfo[]; units: UnitColumn[] } {
    const zoneCells: { col: number; name: string }[] = [];
    const idCells: { col: number; id: number | null }[] = [];
    ws.getRow(HEADER_ROW).eachCell({ includeEmpty: false }, (cell, col) => {
      const t = cellToText(cell.value).text.trim();
      if (/^ZONE_ID/i.test(t)) {
        const m = t.match(/(\d+)/);
        idCells.push({ col, id: m ? +m[1] : null });
      } else if (/^ZONE\s*:/i.test(t)) {
        zoneCells.push({ col, name: t.slice(t.indexOf(':') + 1).trim().toUpperCase() });
      }
    });
    zoneCells.sort((a, b) => a.col - b.col);
    idCells.sort((a, b) => a.col - b.col);
    if (!zoneCells.length) add('error', 'E_NO_ZONE', 'row 1', 'No "ZONE: name" header found');

    const zones: ZoneInfo[] = zoneCells.map((z, i) => {
      const nextCol = zoneCells[i + 1]?.col ?? Number.MAX_SAFE_INTEGER;
      const idCell = idCells.find(c => c.col > z.col && c.col < nextCol);
      return { name: z.name, col: z.col, id: idCell?.id ?? null, where: colLetter(z.col) + HEADER_ROW };
    });

    const seen = new Map<number, string>();
    for (const z of zones) {
      if (z.id === null) {
        add('error', 'E_ZONE_ID_MISSING', z.where, `Zone ${z.name} has no readable ZONE_ID`);
        continue;
      }
      if (seen.has(z.id)) add('error', 'E_ZONE_ID_DUP', z.where, `ZONE_ID ${z.id} is used by ${seen.get(z.id)} and ${z.name}`);
      else seen.set(z.id, z.name);
    }

    const units: UnitColumn[] = [];
    ws.getRow(UNIT_ROW).eachCell({ includeEmpty: false }, (cell, col) => {
      const t = cellToText(cell.value).text.trim();
      if (!/^UNIT\s*\d+$/i.test(t)) return;
      const zone = [...zones].reverse().find(z => z.col <= col);
      if (!zone) return;
      units.push({ zone: zone.name, zoneId: zone.id, unit: +t.replace(/\D/g, ''), col, label: t });
    });
    return { zones, units };
  }

  private similarNames(lines: Line[], add: AddFn): void {
    interface P { zone: string; unit: number; cell: string; label: string; names: { n: string; d: string }[]; }
    const byCell = new Map<string, P>();
    for (const l of lines) {
      let p = byCell.get(l.cell);
      if (!p) { p = { zone: l.zone, unit: l.unit, cell: l.cell, label: l.body, names: [] }; byCell.set(l.cell, p); }
      const n = l.body.replace(/[^A-Z0-9]/g, '');
      p.names.push({ n, d: (n.match(/\d+/g) ?? []).join(',') });
    }
    const places = [...byCell.values()];
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const a = places[i], b = places[j];
        const same = a.zone === b.zone && a.unit === b.unit;
        const thr = same ? NEAR_SAME_UNIT : NEAR_CROSS_UNIT;
        let best = 0;
        for (const x of a.names) {
          for (const y of b.names) {
            if (x.d !== y.d) continue;                       // chak numbers must be equal
            if (!same && x.n.length <= 5) continue;
            const lx = x.n.length, ly = y.n.length;
            if (!lx || !ly) continue;
            if ((2 * Math.min(lx, ly)) / (lx + ly) < thr) continue;   // cheap upper bound
            const s = similarity(x.n, y.n);
            if (s > best) best = s;
          }
        }
        if (best >= thr && best < 0.999) {   // 1.0 = same address, handled above
          const where = same
            ? `${a.zone} unit ${a.unit}`
            : `units differ: ${a.zone} ${a.unit} / ${b.zone} ${b.unit}`;
          add('warning', same ? 'W_NEAR_SAME_UNIT' : 'W_NEAR_CROSS_UNIT', `${a.cell}, ${b.cell}`,
            `Similar names "${a.label}" vs "${b.label}" (${where}, ${best.toFixed(2)})`);
        }
      }
    }
  }
}
