import { Issue } from '../_models/issue.model';

export function finalize(issues: Issue[]) {
  const rank = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...issues].sort((a, b) => rank[a.severity] - rank[b.severity] || a.code.localeCompare(b.code));
  return {
    issues: sorted,
    errorCount: sorted.filter(i => i.severity === 'error').length,
    warningCount: sorted.filter(i => i.severity === 'warning').length,
    infoCount: sorted.filter(i => i.severity === 'info').length
  };
}
