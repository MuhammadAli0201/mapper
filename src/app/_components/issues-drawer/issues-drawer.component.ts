import { Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Issue } from '../../_models/issue.model';

@Component({
  selector: 'app-issues-drawer',
  imports: [FormsModule, NzDrawerModule, NzInputModule, NzTableModule, NzTagModule],
  templateUrl: './issues-drawer.component.html',
  styleUrl: './issues-drawer.component.scss'
})
export class IssuesDrawerComponent {
  open = model(false);
  title = input('');
  issues = input<Issue[]>([]);
  search = signal('');

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.issues();
    return this.issues().filter(i => `${i.code} ${i.where} ${i.message}`.toLowerCase().includes(q));
  });

  codes = computed(() => {
    const m = new Map<string, number>();
    for (const i of this.issues()) m.set(i.code, (m.get(i.code) ?? 0) + 1);
    return [...m];
  });
}
