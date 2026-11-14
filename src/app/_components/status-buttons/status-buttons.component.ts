import { Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-status-buttons',
  imports: [NzButtonModule, NzIconModule],
  templateUrl: './status-buttons.component.html',
  styleUrl: './status-buttons.component.scss'
})
export class StatusButtonsComponent {
  errors = input(0);
  warnings = input(0);
  showErrors = output<void>();
  showWarnings = output<void>();
}
