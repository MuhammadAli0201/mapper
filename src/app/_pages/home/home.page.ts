import { Component, computed, inject, signal } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { FileCardComponent } from '../../_components/file-card/file-card.component';
import { IssuesDrawerComponent } from '../../_components/issues-drawer/issues-drawer.component';
import { ResultSummaryComponent } from '../../_components/result-summary/result-summary.component';
import { JurisdictionAnalysisDto, RegistrationAnalysisDto } from '../../_dtos/analysis.dto';
import { ProcessResultDto } from '../../_dtos/process-result.dto';
import { Issue, Severity } from '../../_models/issue.model';
import { JurisdictionService } from '../../_services/jurisdiction.service';
import { MatcherService } from '../../_services/matcher.service';
import { RegistrationService } from '../../_services/registration.service';
import { saveBlob } from '../../_utils/download.util';

@Component({
  selector: 'app-home',
  imports: [
    NzGridModule, NzButtonModule, NzIconModule, NzProgressModule, NzAlertModule,
    FileCardComponent, IssuesDrawerComponent, ResultSummaryComponent
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage {
  private jurSvc = inject(JurisdictionService);
  private regSvc = inject(RegistrationService);
  private matcher = inject(MatcherService);
  private msg = inject(NzMessageService);

  jur = signal<JurisdictionAnalysisDto | null>(null);
  reg = signal<RegistrationAnalysisDto | null>(null);
  loadingJur = signal(false);
  loadingReg = signal(false);
  processing = signal(false);
  progress = signal(0);
  result = signal<ProcessResultDto | null>(null);

  drawerOpen = signal(false);
  drawerTitle = signal('');
  drawerIssues = signal<Issue[]>([]);

  jurSummary = computed(() => {
    const j = this.jur();
    if (!j) return '';
    return `${j.zoneCount} zones · ${j.unitCount} units · ${j.entries.length} address entries` +
      (j.duplicatesRemoved ? ` · ${j.duplicatesRemoved} duplicate(s) removed` : '');
  });

  regSummary = computed(() => {
    const r = this.reg();
    if (!r || !r.worksheet) return '';
    return `Sheet "${r.sheetName}" · ${r.dataRows} rows with an address`;
  });

  regInfos = computed(() => this.reg()?.issues.filter(i => i.severity === 'info').map(i => i.message) ?? []);

  blockReason = computed(() => {
    const j = this.jur(), r = this.reg();
    if (this.loadingJur() || this.loadingReg()) return 'Reading files...';
    if (!j || !r) return 'Load both files to enable Process.';
    if (j.errorCount > 0) return 'Fix the errors in the jurisdiction file first.';
    if (r.errorCount > 0) return 'Fix the errors in the registrations file first.';
    return '';
  });

  canProcess = computed(() => this.blockReason() === '' && !this.processing());

  async onJurFile(file: File): Promise<void> {
    this.result.set(null);
    this.loadingJur.set(true);
    try {
      this.jur.set(await this.jurSvc.analyze(file));
    } catch (e) {
      this.jur.set(null);
      this.msg.error('Could not read the jurisdiction file: ' + (e as Error).message);
    } finally {
      this.loadingJur.set(false);
    }
  }

  async onRegFile(file: File): Promise<void> {
    this.result.set(null);
    this.loadingReg.set(true);
    try {
      this.reg.set(await this.regSvc.analyze(file));
    } catch (e) {
      this.reg.set(null);
      this.msg.error('Could not read the registrations file: ' + (e as Error).message);
    } finally {
      this.loadingReg.set(false);
    }
  }

  openIssues(which: 'jur' | 'reg', severity: Severity): void {
    const a = which === 'jur' ? this.jur() : this.reg();
    if (!a) return;
    const name = which === 'jur' ? 'Jurisdiction' : 'Registrations';
    this.drawerTitle.set(`${name} file - ${severity === 'error' ? 'Errors' : 'Warnings'}`);
    this.drawerIssues.set(a.issues.filter(i => i.severity === severity));
    this.drawerOpen.set(true);
  }

  async process(): Promise<void> {
    const j = this.jur(), r = this.reg();
    if (!j || !r || !this.canProcess()) return;
    this.processing.set(true);
    this.progress.set(0);
    this.result.set(null);
    try {
      this.matcher.build(j.entries);
      const res = await this.regSvc.process(r, p => this.progress.set(p));
      this.result.set(res);
      this.msg.success('Processing finished');
    } catch (e) {
      this.msg.error('Processing failed: ' + (e as Error).message);
    } finally {
      this.processing.set(false);
    }
  }

  download(): void {
    const r = this.result();
    if (r) saveBlob(r.blob, r.fileName);
  }
}
