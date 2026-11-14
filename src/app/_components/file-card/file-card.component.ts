import { Component, input, output } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { StatusButtonsComponent } from '../status-buttons/status-buttons.component';

@Component({
  selector: 'app-file-card',
  imports: [NzCardModule, NzUploadModule, NzIconModule, NzSpinModule, NzAlertModule, StatusButtonsComponent],
  templateUrl: './file-card.component.html',
  styleUrl: './file-card.component.scss'
})
export class FileCardComponent {
  title = input.required<string>();
  hint = input('');
  fileName = input('');
  summary = input('');
  infos = input<string[]>([]);
  loading = input(false);
  loaded = input(false);
  errors = input(0);
  warnings = input(0);

  fileSelected = output<File>();
  showErrors = output<void>();
  showWarnings = output<void>();

  readonly accept = '.xlsx';

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileSelected.emit(file as unknown as File);
    return false;   // never upload anywhere
  };
}
