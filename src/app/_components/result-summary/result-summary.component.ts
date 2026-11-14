import { Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ProcessResultDto } from '../../_dtos/process-result.dto';

@Component({
  selector: 'app-result-summary',
  imports: [NzCardModule, NzGridModule, NzStatisticModule, NzTableModule, NzButtonModule, NzIconModule],
  templateUrl: './result-summary.component.html',
  styleUrl: './result-summary.component.scss'
})
export class ResultSummaryComponent {
  result = input.required<ProcessResultDto>();
  download = output<void>();

  stats = computed(() => {
    const r = this.result();
    return [
      ['Rows processed', r.total],
      ['Exact', r.exact],
      ['Phrase', r.phrase],
      ['City only', r.city],
      ['No match (left empty)', r.none],
      ['Needs review (left empty)', r.review],
      ['Blank address', r.blank]
    ] as [string, number][];
  });
}
